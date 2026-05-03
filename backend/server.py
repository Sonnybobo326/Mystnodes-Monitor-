"""
Mining Rig Profitability backend.

Live data sources:
  - CoinPaprika (no key): mining-coin prices, market cap, 24h change
  - NodeReal (API key): multi-chain RPC (BSC, ETH, Polygon, opBNB, Arbitrum, Base)
    used for node status grid (block height + gas price) and wallet balance lookups

Endpoints expose the mining rig catalog with per-rig profitability calculations,
a custom calculator, KPIs, live nodes, and address balance look-ups.
Profitability filters out unprofitable rigs by default.
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

from mining_data import COINS, RIGS, normalize_hashrate_to_base

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Mongo (used for saved calculations)
mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

# NodeReal RPC (used for BSC block info enrichment)
NODEREAL_API_KEY = os.environ.get("NODEREAL_API_KEY", "").strip()
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "").strip()
MYSTNODES_REF_CODE = os.environ.get("MYSTNODES_REF_CODE", "").strip()
MYSTNODES_REF_URL = (
    f"https://mystnodes.co/?refCode={MYSTNODES_REF_CODE}"
    if MYSTNODES_REF_CODE else "https://mystnodes.co/"
)

DEFAULT_ELECTRICITY = 0.10  # $/kWh

app = FastAPI(title="Money Making Mining Rigs API")
api = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# In-memory price cache (avoids hammering CoinGecko free tier)
# ---------------------------------------------------------------------------
_price_cache: dict = {"data": None, "ts": 0.0}
PRICE_TTL = 60  # seconds


# Map our internal cg_id (kept for naming compatibility) -> CoinPaprika id.
PAPRIKA_IDS = {
    "bitcoin": "btc-bitcoin",
    "litecoin": "ltc-litecoin",
    "kaspa": "kas-kaspa",
    "ravencoin": "rvn-ravencoin",
    "ethereum-classic": "etc-ethereum-classic",
    "zcash": "zec-zcash",
    "dash": "dash-dash",
    "monero": "xmr-monero",
    "alephium": "alph-alephium",
    "dogecoin": "doge-dogecoin",
    "mysterium": "myst-mysterium",
}


async def _fetch_one_paprika(cli: httpx.AsyncClient, cg_id: str, paprika_id: str) -> tuple:
    try:
        r = await cli.get(f"https://api.coinpaprika.com/v1/tickers/{paprika_id}")
        r.raise_for_status()
        j = r.json()
        q = j.get("quotes", {}).get("USD", {})
        return cg_id, {
            "price": q.get("price", 0.0) or 0.0,
            "change_24h": q.get("percent_change_24h", 0.0) or 0.0,
            "market_cap": q.get("market_cap", 0.0) or 0.0,
            "volume_24h": q.get("volume_24h", 0.0) or 0.0,
        }
    except Exception as exc:
        logger.warning("Paprika fetch failed for %s: %s", paprika_id, exc)
        return cg_id, None


async def _fetch_coingecko_fallback(cli: httpx.AsyncClient, missing_cg_ids: set) -> dict:
    """Fallback to CoinGecko's free /simple/price for any coins CoinPaprika didn't return."""
    if not missing_cg_ids:
        return {}
    ids = ",".join(missing_cg_ids)
    try:
        r = await cli.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={
                "ids": ids,
                "vs_currencies": "usd",
                "include_24hr_change": "true",
                "include_market_cap": "true",
                "include_24hr_vol": "true",
            },
        )
        r.raise_for_status()
        raw = r.json()
        out = {}
        for cid, p in raw.items():
            out[cid] = {
                "price": p.get("usd", 0.0) or 0.0,
                "change_24h": p.get("usd_24h_change", 0.0) or 0.0,
                "market_cap": p.get("usd_market_cap", 0.0) or 0.0,
                "volume_24h": p.get("usd_24h_vol", 0.0) or 0.0,
            }
        return out
    except Exception as exc:
        logger.warning("CoinGecko fallback failed: %s", exc)
        return {}


async def fetch_coin_prices() -> dict:
    """Return {cg_id: {price, change_24h, market_cap, volume_24h}}.

    Primary: CoinPaprika. Fallback: CoinGecko for anything Paprika misses
    (e.g., MYST has no public Paprika ticker).
    """
    import asyncio

    now = time.time()
    if _price_cache["data"] and now - _price_cache["ts"] < PRICE_TTL:
        return _price_cache["data"]

    # Build the full list of cg_ids to fetch (mining coins + merge reward coins + MYST for Mystnodes)
    cg_ids = set(COINS.keys())
    cg_ids.add("mysterium")  # MYST token (used by Mystnodes earnings)
    for c in COINS.values():
        for m in c.get("merge_rewards", []) or []:
            cg_ids.add(m["cg_id"])

    out = {}
    async with httpx.AsyncClient(timeout=8) as cli:
        results = await asyncio.gather(
            *[
                _fetch_one_paprika(cli, cid, PAPRIKA_IDS.get(cid, ""))
                for cid in cg_ids
                if cid in PAPRIKA_IDS
            ],
            return_exceptions=False,
        )
        for cid, data in results:
            if data:
                out[cid] = data

        # Fallback to CoinGecko for any cg_id that didn't come back from Paprika
        missing = {cid for cid in cg_ids if cid not in out}
        if missing:
            cg = await _fetch_coingecko_fallback(cli, missing)
            out.update(cg)

    if out:
        _price_cache["data"] = out
        _price_cache["ts"] = now
        return out
    return _price_cache["data"] or {}


async def fetch_bsc_block_number() -> Optional[int]:
    """Fetch latest BSC block number through NodeReal — proves the integration."""
    if not NODEREAL_API_KEY:
        return None
    url = f"https://bsc-mainnet.nodereal.io/v1/{NODEREAL_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=8) as cli:
            r = await cli.post(
                url,
                json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
            )
            r.raise_for_status()
            j = r.json()
            return int(j["result"], 16)
    except Exception as exc:
        logger.warning("NodeReal fetch failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# NodeReal multi-chain RPC layer
# ---------------------------------------------------------------------------
NODEREAL_CHAINS = {
    "bsc": {
        "name": "BNB Smart Chain",
        "symbol": "BNB",
        "url_tpl": "https://bsc-mainnet.nodereal.io/v1/{key}",
        "decimals": 18,
        "explorer": "https://bscscan.com",
        "block_time": 3.0,
    },
    "eth": {
        "name": "Ethereum",
        "symbol": "ETH",
        "url_tpl": "https://eth-mainnet.nodereal.io/v1/{key}",
        "decimals": 18,
        "explorer": "https://etherscan.io",
        "block_time": 12.0,
    },
    "opbnb": {
        "name": "opBNB",
        "symbol": "BNB",
        "url_tpl": "https://opbnb-mainnet.nodereal.io/v1/{key}",
        "decimals": 18,
        "explorer": "https://opbnbscan.com",
        "block_time": 1.0,
    },
    "arbitrum": {
        "name": "Arbitrum One",
        "symbol": "ETH",
        "url_tpl": "https://open-platform.nodereal.io/{key}/arbitrum-nitro/",
        "decimals": 18,
        "explorer": "https://arbiscan.io",
        "block_time": 0.25,
    },
    "base": {
        "name": "Base",
        "symbol": "ETH",
        "url_tpl": "https://open-platform.nodereal.io/{key}/base/",
        "decimals": 18,
        "explorer": "https://basescan.org",
        "block_time": 2.0,
    },
}

_node_cache: dict = {"data": None, "ts": 0.0}
NODE_TTL = 15  # seconds — keep nodes feeling live


def _chain_url(chain: str) -> Optional[str]:
    if not NODEREAL_API_KEY or chain not in NODEREAL_CHAINS:
        return None
    return NODEREAL_CHAINS[chain]["url_tpl"].format(key=NODEREAL_API_KEY)


async def _rpc_call(cli: httpx.AsyncClient, chain: str, method: str, params: list):
    """Single JSON-RPC call (some NodeReal endpoints don't honour batch)."""
    url = _chain_url(chain)
    if not url:
        return None
    try:
        r = await cli.post(
            url,
            json={"jsonrpc": "2.0", "method": method, "params": params, "id": 1},
        )
        r.raise_for_status()
        return r.json().get("result")
    except Exception as exc:
        logger.warning("NodeReal %s.%s failed: %s", chain, method, exc)
        return None


async def _fetch_chain_status(cli: httpx.AsyncClient, chain: str) -> dict:
    import asyncio

    meta = NODEREAL_CHAINS[chain]
    block_hex, gas_hex, chain_id_hex = await asyncio.gather(
        _rpc_call(cli, chain, "eth_blockNumber", []),
        _rpc_call(cli, chain, "eth_gasPrice", []),
        _rpc_call(cli, chain, "eth_chainId", []),
    )
    return {
        "id": chain,
        "name": meta["name"],
        "symbol": meta["symbol"],
        "online": block_hex is not None,
        "block_number": int(block_hex, 16) if block_hex else None,
        "gas_price_gwei": (int(gas_hex, 16) / 1e9) if gas_hex else None,
        "chain_id": int(chain_id_hex, 16) if chain_id_hex else None,
        "block_time_s": meta["block_time"],
        "explorer": meta["explorer"],
    }


async def fetch_all_node_statuses() -> list:
    """Return live status for every supported NodeReal chain (cached briefly)."""
    import asyncio

    now = time.time()
    if _node_cache["data"] and now - _node_cache["ts"] < NODE_TTL:
        return _node_cache["data"]

    if not NODEREAL_API_KEY:
        return []

    async with httpx.AsyncClient(timeout=8) as cli:
        results = await asyncio.gather(
            *[_fetch_chain_status(cli, c) for c in NODEREAL_CHAINS.keys()],
            return_exceptions=False,
        )
    out = list(results)
    _node_cache["data"] = out
    _node_cache["ts"] = now
    return out


async def fetch_wallet_balance(chain: str, address: str) -> dict:
    """Look up a native-token wallet balance on a given NodeReal chain."""
    if chain not in NODEREAL_CHAINS:
        raise HTTPException(400, f"Unsupported chain '{chain}'")
    if not NODEREAL_API_KEY:
        raise HTTPException(503, "NodeReal not configured")
    if not (address.startswith("0x") and len(address) == 42):
        raise HTTPException(400, "address must be a 0x-prefixed 20-byte EVM address")

    meta = NODEREAL_CHAINS[chain]
    async with httpx.AsyncClient(timeout=8) as cli:
        import asyncio
        bal_hex, nonce_hex, block_hex = await asyncio.gather(
            _rpc_call(cli, chain, "eth_getBalance", [address, "latest"]),
            _rpc_call(cli, chain, "eth_getTransactionCount", [address, "latest"]),
            _rpc_call(cli, chain, "eth_blockNumber", []),
        )
    if bal_hex is None:
        raise HTTPException(502, "Upstream NodeReal RPC failed")
    balance_native = int(bal_hex, 16) / (10 ** meta["decimals"])
    return {
        "chain": chain,
        "chain_name": meta["name"],
        "symbol": meta["symbol"],
        "address": address,
        "balance": balance_native,
        "tx_count": int(nonce_hex, 16) if nonce_hex else 0,
        "as_of_block": int(block_hex, 16) if block_hex else None,
        "explorer_url": f"{meta['explorer']}/address/{address}",
    }


# ---------------------------------------------------------------------------
# Profitability math
# ---------------------------------------------------------------------------
def compute_revenue_per_day(coin: dict, rig_hashrate: float, prices: dict) -> dict:
    """Daily revenue (USD) from mining `coin` with `rig_hashrate` (in coin's unit).

    revenue = (rig_hr / network_hr) * blocks_per_day * block_reward * price
    plus any merge-reward coins.
    """
    nh = coin["network_hashrate"]
    if nh <= 0 or rig_hashrate <= 0:
        return {"revenue_usd": 0.0, "coins_per_day": 0.0, "breakdown": []}

    share = rig_hashrate / nh
    coins_per_day = share * coin["blocks_per_day"] * coin["block_reward"]
    primary_price = prices.get(coin["cg_id"], {}).get("price", 0.0)
    revenue = coins_per_day * primary_price

    breakdown = [{
        "cg_id": coin["cg_id"],
        "symbol": coin["symbol"],
        "coins_per_day": coins_per_day,
        "price": primary_price,
        "usd_per_day": revenue,
    }]

    for merge in coin.get("merge_rewards", []) or []:
        m_coins = share * coin["blocks_per_day"] * merge["per_block"]
        m_price = prices.get(merge["cg_id"], {}).get("price", 0.0)
        m_rev = m_coins * m_price
        revenue += m_rev
        breakdown.append({
            "cg_id": merge["cg_id"],
            "symbol": merge["symbol"],
            "coins_per_day": m_coins,
            "price": m_price,
            "usd_per_day": m_rev,
        })

    return {
        "revenue_usd": revenue,
        "coins_per_day": coins_per_day,
        "breakdown": breakdown,
    }


def compute_profit(rig: dict, prices: dict, electricity: float) -> dict:
    coin = COINS[rig["coin_id"]]
    rev = compute_revenue_per_day(coin, rig["hashrate"], prices)

    power_kwh_day = (rig["power_w"] / 1000.0) * 24.0
    power_cost_day = power_kwh_day * electricity
    profit_day = rev["revenue_usd"] - power_cost_day

    payback_days = None
    roi_year_pct = None
    if profit_day > 0 and rig["price_usd"] > 0:
        payback_days = rig["price_usd"] / profit_day
        roi_year_pct = (profit_day * 365.0) / rig["price_usd"] * 100.0

    return {
        **rig,
        "coin_symbol": coin["symbol"],
        "coin_name": coin["name"],
        "unit": coin["unit"],
        "revenue_usd_day": rev["revenue_usd"],
        "power_cost_usd_day": power_cost_day,
        "profit_usd_day": profit_day,
        "profit_usd_month": profit_day * 30.0,
        "profit_usd_year": profit_day * 365.0,
        "power_kwh_day": power_kwh_day,
        "payback_days": payback_days,
        "roi_year_pct": roi_year_pct,
        "is_profitable": profit_day > 0,
        "revenue_breakdown": rev["breakdown"],
        "efficiency_j_per_unit": (rig["power_w"] / rig["hashrate"]) if rig["hashrate"] else None,
    }


# ---------------------------------------------------------------------------
# Pydantic request/response models
# ---------------------------------------------------------------------------
class CalculatorRequest(BaseModel):
    coin_id: str
    hashrate: float = Field(..., gt=0, description="In the coin's native unit")
    power_w: float = Field(..., gt=0)
    rig_price_usd: float = Field(0.0, ge=0)
    electricity_usd_kwh: float = Field(DEFAULT_ELECTRICITY, ge=0)


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "mining-rigs-api", "version": "1.0"}


@api.get("/coins")
async def list_coins():
    """Return all supported mining coins with live prices and network params."""
    prices = await fetch_coin_prices()
    out = []
    for cid, coin in COINS.items():
        p = prices.get(cid, {})
        out.append({
            "cg_id": cid,
            "symbol": coin["symbol"],
            "name": coin["name"],
            "algo": coin["algo"],
            "unit": coin["unit"],
            "network_hashrate": coin["network_hashrate"],
            "block_reward": coin["block_reward"],
            "blocks_per_day": coin["blocks_per_day"],
            "price_usd": p.get("price", 0.0),
            "change_24h": p.get("change_24h", 0.0),
            "market_cap": p.get("market_cap", 0.0),
            "volume_24h": p.get("volume_24h", 0.0),
            "merge_rewards": coin.get("merge_rewards", []),
        })
    out.sort(key=lambda c: c["market_cap"], reverse=True)
    return out


@api.get("/rigs")
async def list_rigs(
    electricity: float = Query(DEFAULT_ELECTRICITY, ge=0, description="$/kWh"),
    profitable_only: bool = Query(True),
    algo: Optional[str] = Query(None),
    sort: str = Query("profit", regex="^(profit|roi|payback|price)$"),
):
    prices = await fetch_coin_prices()
    enriched = [compute_profit(r, prices, electricity) for r in RIGS]

    if profitable_only:
        enriched = [r for r in enriched if r["is_profitable"]]
    if algo:
        enriched = [r for r in enriched if r["algo"] == algo]

    sort_key = {
        "profit": lambda r: r["profit_usd_day"],
        "roi": lambda r: r["roi_year_pct"] or -1,
        "payback": lambda r: r["payback_days"] or 1e12,
        "price": lambda r: r["price_usd"],
    }[sort]
    reverse = sort != "payback" and sort != "price"
    enriched.sort(key=sort_key, reverse=reverse)
    return enriched


@api.get("/rigs/{rig_id}")
async def rig_detail(rig_id: str, electricity: float = Query(DEFAULT_ELECTRICITY, ge=0)):
    rig = next((r for r in RIGS if r["id"] == rig_id), None)
    if not rig:
        raise HTTPException(404, "Rig not found")
    prices = await fetch_coin_prices()
    return compute_profit(rig, prices, electricity)


@api.post("/calculate")
async def calculate(req: CalculatorRequest):
    if req.coin_id not in COINS:
        raise HTTPException(400, f"Unsupported coin {req.coin_id}")
    coin = COINS[req.coin_id]
    prices = await fetch_coin_prices()
    rev = compute_revenue_per_day(coin, req.hashrate, prices)

    power_kwh_day = (req.power_w / 1000.0) * 24.0
    power_cost = power_kwh_day * req.electricity_usd_kwh
    profit = rev["revenue_usd"] - power_cost

    payback = req.rig_price_usd / profit if profit > 0 and req.rig_price_usd > 0 else None
    roi = (profit * 365.0) / req.rig_price_usd * 100.0 if profit > 0 and req.rig_price_usd > 0 else None

    return {
        "coin_id": req.coin_id,
        "coin_symbol": coin["symbol"],
        "coin_name": coin["name"],
        "unit": coin["unit"],
        "revenue_usd_day": rev["revenue_usd"],
        "power_cost_usd_day": power_cost,
        "profit_usd_day": profit,
        "profit_usd_month": profit * 30.0,
        "profit_usd_year": profit * 365.0,
        "payback_days": payback,
        "roi_year_pct": roi,
        "is_profitable": profit > 0,
        "revenue_breakdown": rev["breakdown"],
    }


@api.get("/stats")
async def dashboard_stats(electricity: float = Query(DEFAULT_ELECTRICITY, ge=0)):
    """KPI summary for the dashboard top strip."""
    prices = await fetch_coin_prices()
    enriched = [compute_profit(r, prices, electricity) for r in RIGS]
    profitable = [r for r in enriched if r["is_profitable"]]
    profitable.sort(key=lambda r: r["profit_usd_day"], reverse=True)

    top_rig = profitable[0] if profitable else None

    # Most profitable coin per $1000 of hardware (synthetic): pick coin whose
    # top rig has best ROI.
    best_coin = None
    best_roi = -1.0
    for r in profitable:
        if (r["roi_year_pct"] or -1) > best_roi:
            best_roi = r["roi_year_pct"] or -1
            best_coin = r["coin_symbol"]

    btc_price = prices.get("bitcoin", {}).get("price", 0.0)
    btc_change = prices.get("bitcoin", {}).get("change_24h", 0.0)

    nodes = await fetch_all_node_statuses()
    bsc = next((n for n in nodes if n["id"] == "bsc"), None)
    bsc_block = bsc["block_number"] if bsc else None
    nodes_online = sum(1 for n in nodes if n.get("online"))

    return {
        "btc_price": btc_price,
        "btc_change_24h": btc_change,
        "total_rigs": len(RIGS),
        "profitable_rigs": len(profitable),
        "unprofitable_rigs": len(RIGS) - len(profitable),
        "top_rig_id": top_rig["id"] if top_rig else None,
        "top_rig_name": top_rig["name"] if top_rig else None,
        "top_rig_profit_day": top_rig["profit_usd_day"] if top_rig else 0.0,
        "best_coin_by_roi": best_coin,
        "best_roi_year_pct": best_roi if best_roi > 0 else 0.0,
        "electricity": electricity,
        "bsc_block_number": bsc_block,
        "nodes_total": len(nodes),
        "nodes_online": nodes_online,
    }


# ---------------------------------------------------------------------------
# NodeReal endpoints
# ---------------------------------------------------------------------------
@api.get("/nodes")
async def list_nodes():
    """Live multi-chain status (block height, gas price, chainId) via NodeReal RPC."""
    nodes = await fetch_all_node_statuses()
    return {
        "configured": bool(NODEREAL_API_KEY),
        "chains": nodes,
        "count": len(nodes),
        "online": sum(1 for n in nodes if n.get("online")),
    }


@api.get("/wallet/{chain}/{address}")
async def wallet_balance(chain: str, address: str):
    """Look up a wallet's native-token balance + tx count via NodeReal RPC."""
    return await fetch_wallet_balance(chain, address)


# ---------------------------------------------------------------------------
# Mystnodes — passive income node program
# ---------------------------------------------------------------------------
# Reasonable estimates (Feb 2026). These can be tuned without code changes.
MYSTNODES_PROFILES = [
    {
        "id": "raspberry-pi",
        "name": "Raspberry Pi 4 / 5",
        "description": "Lowest-cost always-on node. Ideal first node.",
        "hardware_cost_usd": 95,
        "power_w": 7,
        "myst_per_day": 0.45,
    },
    {
        "id": "old-laptop",
        "name": "Spare laptop / Mini PC",
        "description": "Re-use idle hardware. Higher bandwidth, more earnings.",
        "hardware_cost_usd": 0,
        "power_w": 15,
        "myst_per_day": 0.85,
    },
    {
        "id": "home-server",
        "name": "Home server / NAS",
        "description": "Run multiple Mystnodes containers in parallel.",
        "hardware_cost_usd": 350,
        "power_w": 35,
        "myst_per_day": 2.10,
    },
    {
        "id": "vps-residential",
        "name": "Residential IP cluster (3 nodes)",
        "description": "Stack nodes across multiple residential IPs for max yield.",
        "hardware_cost_usd": 250,
        "power_w": 25,
        "myst_per_day": 3.20,
    },
]


@api.get("/mystnodes")
async def mystnodes(electricity: float = Query(DEFAULT_ELECTRICITY, ge=0)):
    """Mystnodes passive-income profiles with live MYST price + referral link."""
    prices = await fetch_coin_prices()
    myst_price = prices.get("mysterium", {}).get("price", 0.0)
    myst_change = prices.get("mysterium", {}).get("change_24h", 0.0)

    profiles = []
    for p in MYSTNODES_PROFILES:
        revenue_day = p["myst_per_day"] * myst_price
        power_cost_day = (p["power_w"] / 1000.0) * 24.0 * electricity
        profit_day = revenue_day - power_cost_day
        payback = (
            p["hardware_cost_usd"] / profit_day
            if profit_day > 0 and p["hardware_cost_usd"] > 0
            else None
        )
        profiles.append({
            **p,
            "revenue_usd_day": revenue_day,
            "power_cost_usd_day": power_cost_day,
            "profit_usd_day": profit_day,
            "profit_usd_month": profit_day * 30.0,
            "profit_usd_year": profit_day * 365.0,
            "payback_days": payback,
            "is_profitable": profit_day > 0,
        })
    profiles.sort(key=lambda x: x["profit_usd_day"], reverse=True)

    return {
        "myst_price_usd": myst_price,
        "myst_change_24h": myst_change,
        "referral_url": MYSTNODES_REF_URL,
        "referral_code": MYSTNODES_REF_CODE,
        "profiles": profiles,
        "electricity": electricity,
    }


# ---------------------------------------------------------------------------
# AI Mining Advisor — Claude Haiku 4.5 via Emergent universal LLM key
# ---------------------------------------------------------------------------
class AdvisorRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    session_id: Optional[str] = None
    electricity_usd_kwh: float = Field(DEFAULT_ELECTRICITY, ge=0)
    budget_usd: Optional[float] = Field(None, ge=0)


def _build_advisor_context(electricity: float, prices: dict, budget: Optional[float]) -> str:
    """Compact, structured context the LLM can reason over without RAG."""
    coin_lines = []
    for cid, coin in COINS.items():
        p = prices.get(cid, {})
        coin_lines.append(
            f"- {coin['symbol']} ({coin['algo']}): ${p.get('price', 0):,.4f} "
            f"({p.get('change_24h', 0):+.2f}% 24h), network {coin['network_hashrate']:,} {coin['unit']}, "
            f"reward {coin['block_reward']} {coin['symbol']}/blk × {coin['blocks_per_day']} blk/d"
        )
    enriched = [compute_profit(r, prices, electricity) for r in RIGS]
    enriched.sort(key=lambda r: r["profit_usd_day"], reverse=True)
    profitable = [r for r in enriched if r["is_profitable"]]
    rig_lines = []
    for r in enriched[:18]:
        rig_lines.append(
            f"- {r['name']} ({r['algo']}, mines {r['coin_symbol']}): {r['hashrate']} {r['unit']}, "
            f"{r['power_w']}W, ${r['price_usd']:,} → "
            f"profit/day ${r['profit_usd_day']:.2f}, "
            f"ROI/yr {r['roi_year_pct'] or 0:.0f}%, payback {r['payback_days'] or 0:.0f}d, "
            f"{'PROFITABLE' if r['is_profitable'] else 'UNPROFITABLE'}"
        )
    budget_line = f"User budget: ${budget:,.0f}." if budget else "User did not specify a budget."
    return (
        f"You are RigBot, a brutally honest mining-rig advisor for the RIG.PROFIT app. "
        f"Style: terse, direct, no fluff. Bullet points OK. Cite specific rig names from the catalog. "
        f"If nothing is profitable for the user's setup, say so plainly. Round dollar values sensibly.\n\n"
        f"USER ELECTRICITY: ${electricity:.3f}/kWh\n{budget_line}\n"
        f"PROFITABLE RIGS RIGHT NOW: {len(profitable)} of {len(enriched)}.\n\n"
        f"COINS (live prices, 24h change, network hashrate, reward):\n"
        + "\n".join(coin_lines)
        + "\n\nRIG CATALOG (top 18 by profit at user's electricity):\n"
        + "\n".join(rig_lines)
        + "\n\nAlso available in the app: Mystnodes (passive bandwidth income, see /mystnodes route)."
    )


@api.post("/advisor/ask")
async def advisor_ask(req: AdvisorRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI advisor not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as exc:  # pragma: no cover
        raise HTTPException(500, f"emergentintegrations import failed: {exc}")

    prices = await fetch_coin_prices()
    system_msg = _build_advisor_context(req.electricity_usd_kwh, prices, req.budget_usd)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=req.session_id or f"advisor-{int(time.time()*1000)}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-haiku-4-5-20251001")

    try:
        answer = await chat.send_message(UserMessage(text=req.question))
    except Exception as exc:
        logger.exception("advisor LLM call failed")
        raise HTTPException(502, f"AI advisor failed: {exc}")

    # Persist for history
    try:
        await db.advisor_chats.insert_one({
            "session_id": req.session_id or "anon",
            "question": req.question,
            "answer": answer,
            "electricity": req.electricity_usd_kwh,
            "budget": req.budget_usd,
            "ts": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass

    return {"answer": answer, "model": "claude-haiku-4-5", "session_id": req.session_id}


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
