"""
Mining Rig Profitability backend.

Exposes endpoints to fetch live mining-coin prices (CoinPaprika), the
mining rig catalog with per-rig profitability calculations, and a custom
calculator. NodeReal RPC is used to enrich the dashboard with the latest
BSC block number. Profitability filters out unprofitable rigs by default.
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional, List

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


async def fetch_coin_prices() -> dict:
    """Return {cg_id: {price, change_24h, market_cap, volume_24h}}.

    Primary source: CoinPaprika (no key, generous free tier).
    """
    import asyncio

    now = time.time()
    if _price_cache["data"] and now - _price_cache["ts"] < PRICE_TTL:
        return _price_cache["data"]

    # Build the full list of cg_ids to fetch (mining coins + merge reward coins)
    cg_ids = set(COINS.keys())
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

    if out:
        _price_cache["data"] = out
        _price_cache["ts"] = now
        return out
    # If everything failed, return last known cache
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

    bsc_block = await fetch_bsc_block_number()

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
    }


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
