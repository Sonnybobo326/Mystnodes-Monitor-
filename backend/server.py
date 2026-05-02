from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import uuid
import asyncio
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
AI_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")
MYSTNODES_API_KEY = os.environ.get('MYSTNODES_API_KEY', '')
PAYOUT_WALLET = os.environ.get('PAYOUT_WALLET', '')
WITHDRAWAL_THRESHOLD_MYST = float(os.environ.get('WITHDRAWAL_THRESHOLD_MYST', '5'))
MYST_TOKEN_POLYGON = os.environ.get('MYST_TOKEN_POLYGON', '0x1379E8886A944d2D9d440b3d88DF536Aea08d9F3')
BLOCKSCOUT_API = os.environ.get('BLOCKSCOUT_API', 'https://polygon.blockscout.com/api')
COINGECKO_API = os.environ.get('COINGECKO_API', 'https://api.coingecko.com/api/v3')
INGEST_SHARED_SECRET = os.environ.get('INGEST_SHARED_SECRET', '')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')

_PRICE_CACHE: Dict[str, Any] = {"ts": 0, "usd": 0.12, "change_24h": 0.0}
_WITHDRAW_CACHE: Dict[str, Any] = {"ts": 0, "data": None}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Models ----------
class Node(BaseModel):
    id: str
    identity: str  # 0x... ethereum address
    name: str
    country: str
    country_code: str
    city: str
    status: str  # online | offline | degraded
    uptime_pct: float
    earnings_myst: float
    earnings_usd: float
    bandwidth_gb: float
    sessions: int
    ip: str
    version: str
    last_seen: str  # ISO
    quality_score: float  # 0-10

class HistoryPoint(BaseModel):
    date: str
    earnings_myst: float
    bandwidth_gb: float
    sessions: int

class Alert(BaseModel):
    id: str
    node_id: Optional[str] = None
    node_name: Optional[str] = None
    severity: str  # info | warning | critical
    message: str
    timestamp: str

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatMessage(BaseModel):
    id: str
    session_id: str
    role: str  # user | assistant
    content: str
    timestamp: str

# ---------- Seed Data ----------
COUNTRIES = [
    ("United States", "US", ["New York", "Chicago", "Austin", "Seattle"]),
    ("Germany", "DE", ["Berlin", "Munich", "Frankfurt"]),
    ("Japan", "JP", ["Tokyo", "Osaka"]),
    ("United Kingdom", "GB", ["London", "Manchester"]),
    ("Netherlands", "NL", ["Amsterdam"]),
    ("Canada", "CA", ["Toronto", "Vancouver"]),
    ("Singapore", "SG", ["Singapore"]),
    ("Brazil", "BR", ["São Paulo"]),
    ("France", "FR", ["Paris"]),
    ("Australia", "AU", ["Sydney"]),
]

NODE_NAMES = [
    "titan", "nova", "orion", "vega", "atlas", "lyra", "draco", "phoenix",
    "hydra", "pegasus", "cygnus", "andromeda", "cassiopeia", "perseus"
]


def _rand_identity() -> str:
    hexchars = "0123456789abcdef"
    return "0x" + "".join(random.choice(hexchars) for _ in range(40))


def _rand_ip() -> str:
    return ".".join(str(random.randint(1, 254)) for _ in range(4))


async def seed_nodes_if_needed():
    count = await db.nodes.count_documents({})
    if count > 0:
        return
    logger.info("Seeding mock Mystnodes data...")
    nodes = []
    random.seed(42)
    for i in range(12):
        country, cc, cities = random.choice(COUNTRIES)
        city = random.choice(cities)
        name_root = random.choice(NODE_NAMES)
        status_roll = random.random()
        if status_roll < 0.75:
            status = "online"
            uptime = round(random.uniform(96.0, 99.99), 2)
        elif status_roll < 0.9:
            status = "degraded"
            uptime = round(random.uniform(80.0, 95.0), 2)
        else:
            status = "offline"
            uptime = round(random.uniform(40.0, 75.0), 2)

        earnings = round(random.uniform(12.0, 180.0), 2) if status != "offline" else round(random.uniform(0.0, 10.0), 2)
        node = {
            "id": str(uuid.uuid4()),
            "identity": _rand_identity(),
            "name": f"{name_root}-{i+1:02d}",
            "country": country,
            "country_code": cc,
            "city": city,
            "status": status,
            "uptime_pct": uptime,
            "earnings_myst": earnings,
            "earnings_usd": round(earnings * 0.12, 2),
            "bandwidth_gb": round(random.uniform(30.0, 850.0), 1),
            "sessions": random.randint(45, 1800),
            "ip": _rand_ip(),
            "version": random.choice(["1.19.1", "1.20.0", "1.21.2"]),
            "last_seen": (datetime.now(timezone.utc) - timedelta(minutes=random.randint(0, 240))).isoformat(),
            "quality_score": round(random.uniform(4.5, 9.8), 1),
        }
        nodes.append(node)
    await db.nodes.insert_many(nodes)

    # Seed 30 days history
    history = []
    base = datetime.now(timezone.utc).date()
    for days_ago in range(30, -1, -1):
        d = base - timedelta(days=days_ago)
        total_earn = round(random.uniform(40.0, 120.0) + days_ago * 0.4, 2)
        total_bw = round(random.uniform(400.0, 2200.0), 1)
        sessions = random.randint(800, 4200)
        history.append({
            "date": d.isoformat(),
            "earnings_myst": total_earn,
            "bandwidth_gb": total_bw,
            "sessions": sessions,
        })
    await db.history.insert_many(history)

    # Seed alerts
    alerts = []
    sample_nodes = await db.nodes.find({}, {"_id": 0}).to_list(12)
    for i in range(6):
        n = random.choice(sample_nodes)
        sev = random.choice(["info", "warning", "critical"])
        msg_map = {
            "info": f"Node {n['name']} completed {random.randint(50, 300)} sessions in last hour",
            "warning": f"Node {n['name']} uptime dropped below 95% ({n['uptime_pct']}%)",
            "critical": f"Node {n['name']} went offline — last heartbeat {random.randint(5, 120)} min ago",
        }
        alerts.append({
            "id": str(uuid.uuid4()),
            "node_id": n["id"],
            "node_name": n["name"],
            "severity": sev,
            "message": msg_map[sev],
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=random.randint(1, 600))).isoformat(),
        })
    await db.alerts.insert_many(alerts)
    logger.info("Seed complete.")


@app.on_event("startup")
async def on_startup():
    try:
        await seed_nodes_if_needed()
    except Exception as e:
        logger.exception(f"Seed error: {e}")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "mystnodes-monitor-api", "status": "ok"}


@api_router.get("/overview")
async def overview():
    price = await _get_myst_price()
    nodes = await db.nodes.find({}, {"_id": 0}).to_list(1000)
    active = sum(1 for n in nodes if n["status"] == "online")
    degraded = sum(1 for n in nodes if n["status"] == "degraded")
    offline = sum(1 for n in nodes if n["status"] == "offline")
    total_earnings = round(sum(n["earnings_myst"] for n in nodes), 2)
    total_usd = round(total_earnings * price["usd"], 2)
    total_bw = round(sum(n["bandwidth_gb"] for n in nodes), 1)
    total_sessions = sum(n["sessions"] for n in nodes)
    avg_uptime = round(sum(n["uptime_pct"] for n in nodes) / max(len(nodes), 1), 2)
    avg_quality = round(sum(n["quality_score"] for n in nodes) / max(len(nodes), 1), 2)
    return {
        "total_nodes": len(nodes),
        "active": active,
        "degraded": degraded,
        "offline": offline,
        "total_earnings_myst": total_earnings,
        "total_earnings_usd": total_usd,
        "total_bandwidth_gb": total_bw,
        "total_sessions": total_sessions,
        "avg_uptime_pct": avg_uptime,
        "avg_quality_score": avg_quality,
        "myst_price_usd": price["usd"],
        "myst_price_change_24h_pct": price["change_24h"],
    }


@api_router.get("/nodes", response_model=List[Node])
async def list_nodes():
    nodes = await db.nodes.find({}, {"_id": 0}).to_list(1000)
    return nodes


@api_router.get("/nodes/{node_id}")
async def get_node(node_id: str):
    node = await db.nodes.find_one({"id": node_id}, {"_id": 0})
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    # generate per-node last-30-day synthetic history deterministically
    random.seed(node_id)
    history = []
    base = datetime.now(timezone.utc).date()
    for days_ago in range(30, -1, -1):
        d = base - timedelta(days=days_ago)
        factor = node["earnings_myst"] / 30.0
        history.append({
            "date": d.isoformat(),
            "earnings_myst": round(max(0, factor + random.uniform(-factor * 0.4, factor * 0.4)), 3),
            "bandwidth_gb": round(max(0, (node["bandwidth_gb"] / 30.0) + random.uniform(-5, 5)), 2),
            "sessions": max(0, int(node["sessions"] / 30 + random.randint(-10, 15))),
        })
    return {"node": node, "history": history}


@api_router.get("/history")
async def history(days: int = 30):
    docs = await db.history.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    return docs[-days:]


@api_router.get("/alerts")
async def get_alerts():
    docs = await db.alerts.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    return docs


@api_router.post("/refresh")
async def refresh():
    """Simulate live refresh by perturbing node metrics."""
    nodes = await db.nodes.find({}, {"_id": 0}).to_list(1000)
    for n in nodes:
        delta = random.uniform(-0.6, 1.5)
        new_earn = max(0.0, round(n["earnings_myst"] + delta, 2))
        await db.nodes.update_one(
            {"id": n["id"]},
            {"$set": {
                "earnings_myst": new_earn,
                "earnings_usd": round(new_earn * 0.12, 2),
                "bandwidth_gb": round(max(0, n["bandwidth_gb"] + random.uniform(-2, 6)), 1),
                "sessions": max(0, n["sessions"] + random.randint(-3, 12)),
                "last_seen": datetime.now(timezone.utc).isoformat(),
            }}
        )
    return {"ok": True}


# ---------- AI ----------
def _build_context_summary(nodes: List[dict], overview_data: dict) -> str:
    lines = [
        "=== MYSTNODES FLEET SNAPSHOT ===",
        f"Total nodes: {overview_data['total_nodes']} | Online: {overview_data['active']} | Degraded: {overview_data['degraded']} | Offline: {overview_data['offline']}",
        f"Total earnings: {overview_data['total_earnings_myst']} MYST (~${overview_data['total_earnings_usd']})",
        f"Total bandwidth served: {overview_data['total_bandwidth_gb']} GB | Total sessions: {overview_data['total_sessions']}",
        f"Avg uptime: {overview_data['avg_uptime_pct']}% | Avg quality score: {overview_data['avg_quality_score']}/10",
        "",
        "=== PER-NODE DATA ===",
    ]
    for n in nodes:
        lines.append(
            f"- {n['name']} [{n['status'].upper()}] {n['city']},{n['country_code']} | "
            f"uptime={n['uptime_pct']}% earn={n['earnings_myst']} MYST bw={n['bandwidth_gb']}GB "
            f"sessions={n['sessions']} quality={n['quality_score']}/10 ip={n['ip']} v{n['version']}"
        )
    return "\n".join(lines)


async def _get_context_text() -> str:
    nodes = await db.nodes.find({}, {"_id": 0}).to_list(1000)
    ov = await overview()
    return _build_context_summary(nodes, ov)


@api_router.post("/ai/chat")
async def ai_chat(req: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    context = await _get_context_text()
    system_message = (
        "You are NODE-OPS, an elite AI copilot embedded in the Mystnodes Monitor dashboard. "
        "You help operators of Mysterium Network (MYST) nodes understand performance, optimize earnings, "
        "diagnose issues, and plan capacity. Be precise, technical, and concise — like a senior SRE. "
        "Use bullet lists, short headers, and reference specific nodes by name when relevant. "
        "Always ground answers in the LIVE FLEET DATA below. If a user asks for a forecast, estimate "
        "reasonably and state assumptions. Respond in plain text (no markdown code fences).\n\n"
        f"{context}"
    )

    # persist user message
    user_msg_doc = {
        "id": str(uuid.uuid4()),
        "session_id": req.session_id,
        "role": "user",
        "content": req.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(user_msg_doc)

    # load history for this session from DB to replay into a fresh LlmChat
    history_docs = await db.chat_messages.find(
        {"session_id": req.session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(200)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=req.session_id,
        system_message=system_message,
    ).with_model(AI_MODEL[0], AI_MODEL[1])

    # replay prior messages except the current last user message
    prior = history_docs[:-1]
    for m in prior:
        if m["role"] == "user":
            try:
                await chat.send_message(UserMessage(text=m["content"]))
            except Exception:
                break

    try:
        reply_text = await chat.send_message(UserMessage(text=req.message))
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    assistant_doc = {
        "id": str(uuid.uuid4()),
        "session_id": req.session_id,
        "role": "assistant",
        "content": reply_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(assistant_doc)
    return {"reply": reply_text, "session_id": req.session_id}


@api_router.get("/ai/history/{session_id}")
async def ai_history(session_id: str):
    docs = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(500)
    return docs


@api_router.post("/ai/insights")
async def ai_insights():
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    context = await _get_context_text()
    system_message = (
        "You are NODE-OPS analytics. Analyze the Mystnodes fleet data and return STRICTLY a compact JSON object, "
        "no markdown, no commentary. Schema: "
        '{"insights":[{"severity":"info|warning|critical","title":"short title","detail":"1-2 sentence actionable detail","node":"optional node name"}]}. '
        "Return 4 to 6 insights ordered by severity (critical first). Focus on: anomalies, underperforming nodes, "
        "earnings optimization, uptime issues, quality score outliers. Reference specific node names."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"insights-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model(AI_MODEL[0], AI_MODEL[1])

    try:
        raw = await chat.send_message(UserMessage(text=f"Analyze this fleet data and return insights JSON.\n\n{context}"))
    except Exception as e:
        logger.exception("LLM insights error")
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    import json as _json
    import re as _re
    cleaned = raw.strip()
    # strip possible fences
    cleaned = _re.sub(r"^```(?:json)?|```$", "", cleaned, flags=_re.MULTILINE).strip()
    try:
        data = _json.loads(cleaned)
    except Exception:
        # try to locate JSON block
        m = _re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            try:
                data = _json.loads(m.group(0))
            except Exception:
                data = {"insights": [{"severity": "info", "title": "AI response", "detail": cleaned[:300]}]}
        else:
            data = {"insights": [{"severity": "info", "title": "AI response", "detail": cleaned[:300]}]}
    return data


@api_router.post("/ai/forecast")
async def ai_forecast(days: int = 7):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    hist = await db.history.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    recent = hist[-14:]
    hist_text = "\n".join(f"{h['date']}: {h['earnings_myst']} MYST, {h['bandwidth_gb']} GB, {h['sessions']} sessions" for h in recent)
    system_message = (
        "You are an earnings forecaster for a Mystnodes fleet. Given 14 days of history, produce a realistic "
        f"{days}-day forward forecast. Return STRICTLY JSON: "
        '{"forecast":[{"date":"YYYY-MM-DD","earnings_myst":number}],"summary":"one sentence"}'
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"forecast-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model(AI_MODEL[0], AI_MODEL[1])
    try:
        raw = await chat.send_message(UserMessage(text=hist_text))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    import json as _json
    import re as _re
    cleaned = _re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=_re.MULTILINE).strip()
    try:
        return _json.loads(cleaned)
    except Exception:
        m = _re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            try:
                return _json.loads(m.group(0))
            except Exception:
                pass
        return {"forecast": [], "summary": cleaned[:300]}


# ---------- Wallet / Auto-Withdrawal / Profit Optimizer ----------
def _mask_key(k: str) -> str:
    if not k:
        return ""
    if len(k) <= 8:
        return "*" * len(k)
    return k[:4] + "•" * (len(k) - 8) + k[-4:]


@api_router.get("/settings")
async def get_settings():
    """Returns wallet config + the exact CLI commands to configure each node for auto-withdrawal."""
    configured = bool(MYSTNODES_API_KEY and PAYOUT_WALLET)
    commands = []
    if configured:
        commands = [
            {
                "label": "1. Claim node on mystnodes.com (run once per node)",
                "cmd": f"mmn {MYSTNODES_API_KEY}",
            },
            {
                "label": "2. Set Polygon MYST payout wallet as beneficiary (enables auto-withdrawal at threshold)",
                "cmd": f"myst cli identities beneficiary-set {PAYOUT_WALLET}",
            },
            {
                "label": "3. (Optional) Force-settle current earnings now",
                "cmd": "myst cli identities settle",
            },
            {
                "label": "4. Verify configuration",
                "cmd": "myst cli identities get",
            },
        ]
    return {
        "configured": configured,
        "wallet": PAYOUT_WALLET,
        "wallet_short": (PAYOUT_WALLET[:6] + "…" + PAYOUT_WALLET[-4:]) if PAYOUT_WALLET else "",
        "api_key_masked": _mask_key(MYSTNODES_API_KEY),
        "threshold_myst": WITHDRAWAL_THRESHOLD_MYST,
        "polygon_scan_url": f"https://polygonscan.com/token/{MYST_TOKEN_POLYGON}?a={PAYOUT_WALLET}" if PAYOUT_WALLET else "",
        "myst_contract": MYST_TOKEN_POLYGON,
        "commands": commands,
        "notes": [
            "Mystnodes has no cloud REST API — the dashboard key is used on each node via the Mysterium CLI.",
            "Auto-withdrawal is configured per-node: once you run the beneficiary-set command above, earnings settle automatically to your Polygon wallet when balance ≥ threshold (default ~5 MYST).",
            "Live on-chain withdrawal history is viewable on Polygonscan via the link above.",
        ],
    }


class WithdrawalSettingsUpdate(BaseModel):
    wallet: Optional[str] = None
    threshold_myst: Optional[float] = None


@api_router.post("/settings")
async def update_settings(update: WithdrawalSettingsUpdate):
    """Store optional overrides in DB (does not modify .env). Returns effective settings."""
    doc = await db.settings.find_one({"_id": "singleton"}) or {"_id": "singleton"}
    if update.wallet is not None:
        doc["wallet"] = update.wallet
    if update.threshold_myst is not None:
        doc["threshold_myst"] = float(update.threshold_myst)
    await db.settings.update_one({"_id": "singleton"}, {"$set": doc}, upsert=True)
    return {"ok": True, "wallet": doc.get("wallet", PAYOUT_WALLET), "threshold_myst": doc.get("threshold_myst", WITHDRAWAL_THRESHOLD_MYST)}


@api_router.get("/withdrawals")
async def withdrawals():
    """Returns deterministic simulated withdrawal history for the configured wallet, plus a deep-link to Polygonscan for the real on-chain record."""
    if not PAYOUT_WALLET:
        return {"wallet": "", "withdrawals": [], "polygon_scan_url": ""}
    # Derive realistic-looking entries from fleet history (demo) — real data is at Polygonscan
    hist = await db.history.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    withdrawals = []
    bucket = 0.0
    for h in hist:
        bucket += h["earnings_myst"] * 0.12  # only fleet-net portion simulated
        if bucket >= WITHDRAWAL_THRESHOLD_MYST:
            withdrawals.append({
                "date": h["date"],
                "amount_myst": round(bucket, 3),
                "tx_hash_preview": "0x" + uuid.uuid5(uuid.NAMESPACE_DNS, h["date"] + PAYOUT_WALLET).hex[:40],
                "status": "settled",
            })
            bucket = 0.0
    return {
        "wallet": PAYOUT_WALLET,
        "threshold_myst": WITHDRAWAL_THRESHOLD_MYST,
        "withdrawals": withdrawals[-12:],
        "pending_myst": round(bucket, 3),
        "polygon_scan_url": f"https://polygonscan.com/token/{MYST_TOKEN_POLYGON}?a={PAYOUT_WALLET}",
        "note": "Simulated from fleet history for UI preview. Real withdrawals are visible on Polygonscan (link above).",
    }


@api_router.post("/ai/profit-optimizer")
async def ai_profit_optimizer():
    """Runs Claude against full fleet data and returns a ranked, actionable profit playbook."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    context = await _get_context_text()
    system_message = (
        "You are PROFIT-OPS, a Mysterium Network fleet optimization engine. Output STRICTLY a JSON object "
        "(no markdown, no fences) with this schema:\n"
        '{"estimated_current_monthly_myst": number, "estimated_optimized_monthly_myst": number, '
        '"uplift_pct": number, "headline": "1 sentence takeaway", '
        '"actions": [{"priority": 1-5, "category": "RESTART|RELOCATE|PRICING|HARDWARE|NETWORK|SETTLEMENT", '
        '"target_node": "node name or FLEET", "action": "imperative verb phrase", '
        '"rationale": "1-2 sentence technical reasoning", '
        '"expected_myst_delta_monthly": number, "effort": "LOW|MEDIUM|HIGH"}]}\n\n'
        "Rules: Produce 5-8 concrete actions ordered by priority (1 = highest ROI). Focus on: "
        "offline/degraded nodes (restart/relocate), low-quality-score nodes, geographic rebalancing, "
        "uptime anomalies, settlement timing, pricing on over/under-utilized nodes. Reference nodes "
        "by their exact names from the data. Numbers must be realistic estimates."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"profit-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model(AI_MODEL[0], AI_MODEL[1])

    try:
        raw = await chat.send_message(UserMessage(text=f"Analyze this fleet and produce the profit playbook.\n\n{context}"))
    except Exception as e:
        logger.exception("profit optimizer error")
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    import json as _json
    import re as _re
    cleaned = _re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=_re.MULTILINE).strip()
    try:
        data = _json.loads(cleaned)
    except Exception:
        m = _re.search(r"\{[\s\S]*\}", cleaned)
        data = _json.loads(m.group(0)) if m else {
            "headline": cleaned[:300],
            "actions": [],
            "estimated_current_monthly_myst": 0,
            "estimated_optimized_monthly_myst": 0,
            "uplift_pct": 0,
        }
    return data


# ---------- Price / On-chain / Ingest / Telegram / Auto-Pilot ----------
async def _get_myst_price() -> Dict[str, float]:
    now = datetime.now(timezone.utc).timestamp()
    if now - _PRICE_CACHE["ts"] < 300 and _PRICE_CACHE["ts"] > 0:
        return {"usd": _PRICE_CACHE["usd"], "change_24h": _PRICE_CACHE["change_24h"]}
    try:
        async with httpx.AsyncClient(timeout=6) as hc:
            r = await hc.get(f"{COINGECKO_API}/simple/price",
                             params={"ids": "mysterium", "vs_currencies": "usd",
                                     "include_24hr_change": "true"})
            d = r.json().get("mysterium", {})
            usd = float(d.get("usd", 0) or 0)
            change = float(d.get("usd_24h_change", 0) or 0)
            if usd > 0:
                _PRICE_CACHE["ts"] = now
                _PRICE_CACHE["usd"] = usd
                _PRICE_CACHE["change_24h"] = change
    except Exception as e:
        logger.warning(f"CoinGecko price fetch failed: {e}")
    return {"usd": _PRICE_CACHE["usd"], "change_24h": _PRICE_CACHE["change_24h"]}


@api_router.get("/price/myst")
async def price_myst():
    p = await _get_myst_price()
    return {"symbol": "MYST", "usd": p["usd"], "change_24h_pct": p["change_24h"],
            "source": "coingecko", "cached_ttl_s": 300}


async def _fetch_onchain_withdrawals() -> Dict[str, Any]:
    now = datetime.now(timezone.utc).timestamp()
    if now - _WITHDRAW_CACHE["ts"] < 60 and _WITHDRAW_CACHE["data"] is not None:
        return _WITHDRAW_CACHE["data"]
    if not PAYOUT_WALLET:
        return {"wallet": "", "withdrawals": [], "total_myst_received": 0.0, "total_usd_received": 0.0}
    params = {
        "module": "account", "action": "tokentx",
        "contractaddress": MYST_TOKEN_POLYGON,
        "address": PAYOUT_WALLET, "sort": "desc",
    }
    wallet_lc = PAYOUT_WALLET.lower()
    txs: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=12) as hc:
            r = await hc.get(BLOCKSCOUT_API, params=params)
            j = r.json()
            results = j.get("result", [])
            if isinstance(results, list):
                for t in results[:100]:
                    try:
                        decimals = int(t.get("tokenDecimal", 18))
                        amount = int(t.get("value", "0")) / (10 ** decimals)
                        ts = int(t.get("timeStamp", "0"))
                        direction = "in" if t.get("to", "").lower() == wallet_lc else "out"
                        txs.append({
                            "tx_hash": t.get("hash", ""),
                            "direction": direction,
                            "amount_myst": round(amount, 4),
                            "from": t.get("from", ""),
                            "to": t.get("to", ""),
                            "timestamp": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
                            "block": t.get("blockNumber", ""),
                        })
                    except Exception:
                        continue
    except Exception as e:
        logger.warning(f"Blockscout fetch failed: {e}")

    price = await _get_myst_price()
    total_in = sum(t["amount_myst"] for t in txs if t["direction"] == "in")
    data = {
        "wallet": PAYOUT_WALLET,
        "withdrawals": txs,
        "incoming_count": sum(1 for t in txs if t["direction"] == "in"),
        "total_myst_received": round(total_in, 4),
        "total_usd_received": round(total_in * price["usd"], 2),
        "myst_price_usd": price["usd"],
        "polygon_scan_url": f"https://polygonscan.com/token/{MYST_TOKEN_POLYGON}?a={PAYOUT_WALLET}",
        "blockscout_url": f"https://polygon.blockscout.com/address/{PAYOUT_WALLET}",
        "source": "blockscout-polygon",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    _WITHDRAW_CACHE["ts"] = now
    _WITHDRAW_CACHE["data"] = data
    return data


@api_router.get("/onchain/withdrawals")
async def onchain_withdrawals():
    return await _fetch_onchain_withdrawals()


class NodeIngest(BaseModel):
    identity: str
    name: Optional[str] = None
    status: str
    uptime_pct: float
    earnings_myst: float
    bandwidth_gb: float
    sessions: int
    ip: Optional[str] = None
    version: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    city: Optional[str] = None
    quality_score: Optional[float] = None


@api_router.post("/ingest/node")
async def ingest_node(payload: NodeIngest, x_ingest_secret: Optional[str] = Header(default=None)):
    if not INGEST_SHARED_SECRET or x_ingest_secret != INGEST_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="invalid ingest secret")
    now_iso = datetime.now(timezone.utc).isoformat()
    existing = await db.nodes.find_one({"identity": payload.identity}, {"_id": 0})
    base = existing or {"id": str(uuid.uuid4())}
    price = await _get_myst_price()
    update = {
        "id": base.get("id", str(uuid.uuid4())),
        "identity": payload.identity,
        "name": payload.name or base.get("name") or payload.identity[:8],
        "country": payload.country or base.get("country", "Unknown"),
        "country_code": payload.country_code or base.get("country_code", "XX"),
        "city": payload.city or base.get("city", "—"),
        "status": payload.status,
        "uptime_pct": float(payload.uptime_pct),
        "earnings_myst": float(payload.earnings_myst),
        "earnings_usd": round(float(payload.earnings_myst) * price["usd"], 2),
        "bandwidth_gb": float(payload.bandwidth_gb),
        "sessions": int(payload.sessions),
        "ip": payload.ip or base.get("ip", "0.0.0.0"),
        "version": payload.version or base.get("version", "unknown"),
        "quality_score": float(payload.quality_score) if payload.quality_score is not None else base.get("quality_score", 7.0),
        "last_seen": now_iso,
        "source": "bridge-agent",
    }
    await db.nodes.update_one({"identity": payload.identity}, {"$set": update}, upsert=True)

    prev_status = existing.get("status") if existing else None
    if prev_status == "online" and payload.status in ("offline", "degraded"):
        msg = f"Node {update['name']} went {payload.status.upper()}"
        await db.alerts.insert_one({
            "id": str(uuid.uuid4()), "node_id": update["id"], "node_name": update["name"],
            "severity": "critical" if payload.status == "offline" else "warning",
            "message": msg, "timestamp": now_iso,
        })
        await _telegram_send(f"🚨 {msg}")
    return {"ok": True, "id": update["id"]}


async def _telegram_send(text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as hc:
            r = await hc.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"},
            )
            return r.status_code == 200
    except Exception as e:
        logger.warning(f"Telegram send failed: {e}")
        return False


class TelegramTestBody(BaseModel):
    message: Optional[str] = None


@api_router.get("/telegram/status")
async def telegram_status():
    return {
        "configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
        "bot_set": bool(TELEGRAM_BOT_TOKEN),
        "chat_set": bool(TELEGRAM_CHAT_ID),
    }


@api_router.post("/telegram/test")
async def telegram_test(body: TelegramTestBody):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return {"ok": False, "reason": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in backend/.env"}
    ok = await _telegram_send(body.message or "✅ Mystnodes Monitor: Telegram alerts are active.")
    return {"ok": ok}


_AUTOPILOT_TASK: Optional[asyncio.Task] = None


async def _autopilot_loop():
    await asyncio.sleep(30)
    while True:
        try:
            if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
                try:
                    result = await ai_profit_optimizer()
                    top = (result.get("actions") or [])[:3]
                    if top:
                        headline = result.get("headline", "Top actions to grow MYST")
                        uplift = result.get("uplift_pct", 0) or 0
                        lines = [f"⚡ <b>Profit Auto-Pilot</b> · +{uplift:.1f}% uplift potential",
                                 f"<i>{headline}</i>", ""]
                        for i, a in enumerate(top, 1):
                            lines.append(
                                f"{i}. [{a.get('category')}] {a.get('action')} → +{a.get('expected_myst_delta_monthly', 0):.1f} MYST/mo ({a.get('target_node')})"
                            )
                        await _telegram_send("\n".join(lines))
                except Exception as e:
                    logger.warning(f"autopilot run failed: {e}")
                cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
                nodes = await db.nodes.find({}, {"_id": 0}).to_list(1000)
                for n in nodes:
                    if n.get("source") != "bridge-agent":
                        continue
                    try:
                        ls = datetime.fromisoformat(n["last_seen"])
                    except Exception:
                        continue
                    if ls < cutoff and n.get("status") != "offline":
                        await _telegram_send(f"⚠️ {n['name']} heartbeat stale (>15 min) — check node")
        except Exception as e:
            logger.exception(f"autopilot loop error: {e}")
        await asyncio.sleep(6 * 3600)


@app.on_event("startup")
async def _start_autopilot():
    global _AUTOPILOT_TASK
    if _AUTOPILOT_TASK is None or _AUTOPILOT_TASK.done():
        _AUTOPILOT_TASK = asyncio.create_task(_autopilot_loop())


# ---------- Bridge install helper (registered BEFORE include_router) ----------
from fastapi.responses import PlainTextResponse
from fastapi import Request as _FReq


@api_router.get("/bridge/install")
async def bridge_install(request: _FReq):
    base = str(request.base_url).rstrip("/")
    secret = INGEST_SHARED_SECRET or "SET_INGEST_SECRET"
    download_url = f"{base}/api/bridge/download"
    install = (
        f"curl -fsSL {download_url} -o /usr/local/bin/mm-bridge && "
        f"chmod +x /usr/local/bin/mm-bridge && "
        f"MONITOR_URL={base} INGEST_SECRET={secret} nohup /usr/local/bin/mm-bridge >/var/log/mm-bridge.log 2>&1 &"
    )
    systemd = (
        f"[Unit]\nDescription=Mystnodes Monitor Bridge\nAfter=network.target\n\n"
        f"[Service]\nType=simple\n"
        f"Environment=MONITOR_URL={base}\n"
        f"Environment=INGEST_SECRET={secret}\n"
        f"Environment=TEQUILAPI_USER=myst\n"
        f"Environment=TEQUILAPI_PASS=mystberry\n"
        f"ExecStart=/usr/local/bin/mm-bridge\nRestart=always\nRestartSec=10\n\n"
        f"[Install]\nWantedBy=multi-user.target\n"
    )
    return {
        "monitor_url": base,
        "download_url": download_url,
        "ingest_secret": secret,
        "one_line_install": install,
        "systemd_unit": systemd,
    }


@api_router.get("/bridge/download", response_class=PlainTextResponse)
async def bridge_download():
    p = ROOT_DIR / "scripts" / "bridge_agent.py"
    try:
        return PlainTextResponse(p.read_text(), media_type="text/x-python")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"bridge agent not found: {e}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
