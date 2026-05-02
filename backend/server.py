from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import uuid
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
    nodes = await db.nodes.find({}, {"_id": 0}).to_list(1000)
    active = sum(1 for n in nodes if n["status"] == "online")
    degraded = sum(1 for n in nodes if n["status"] == "degraded")
    offline = sum(1 for n in nodes if n["status"] == "offline")
    total_earnings = round(sum(n["earnings_myst"] for n in nodes), 2)
    total_usd = round(sum(n["earnings_usd"] for n in nodes), 2)
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
