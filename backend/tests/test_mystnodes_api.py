"""Backend API tests for Mystnodes Monitor app."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-monitor-tune.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Overview ----------
def test_overview(session):
    r = session.get(f"{API}/overview", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_nodes", "active", "degraded", "offline",
              "total_earnings_myst", "total_bandwidth_gb",
              "total_sessions", "avg_uptime_pct", "avg_quality_score"]:
        assert k in d, f"missing key {k}"
    assert d["total_nodes"] == 12
    assert d["active"] + d["degraded"] + d["offline"] == d["total_nodes"]


# ---------- Nodes list ----------
def test_nodes_list(session):
    r = session.get(f"{API}/nodes", timeout=30)
    assert r.status_code == 200
    nodes = r.json()
    assert isinstance(nodes, list)
    assert len(nodes) == 12
    required = ["id", "identity", "name", "country", "status", "uptime_pct",
                "earnings_myst", "bandwidth_gb", "sessions", "ip", "version", "quality_score"]
    for n in nodes:
        for k in required:
            assert k in n, f"missing key {k} in node"
        assert n["status"] in ("online", "offline", "degraded")
        assert n["identity"].startswith("0x")


# ---------- Node detail ----------
def test_node_detail_with_history(session):
    r = session.get(f"{API}/nodes", timeout=30)
    nid = r.json()[0]["id"]
    r2 = session.get(f"{API}/nodes/{nid}", timeout=30)
    assert r2.status_code == 200
    d = r2.json()
    assert "node" in d and "history" in d
    assert d["node"]["id"] == nid
    assert isinstance(d["history"], list)
    assert len(d["history"]) == 31  # range(30,-1,-1) = 31 entries
    for h in d["history"]:
        assert {"date", "earnings_myst", "bandwidth_gb", "sessions"} <= set(h.keys())


def test_node_detail_404(session):
    r = session.get(f"{API}/nodes/nonexistent-id-xyz", timeout=30)
    assert r.status_code == 404


# ---------- History ----------
def test_history_30(session):
    r = session.get(f"{API}/history?days=30", timeout=30)
    assert r.status_code == 200
    docs = r.json()
    assert isinstance(docs, list)
    assert len(docs) == 30
    for d in docs:
        for k in ["date", "earnings_myst", "bandwidth_gb", "sessions"]:
            assert k in d


# ---------- Alerts ----------
def test_alerts_sorted_desc(session):
    r = session.get(f"{API}/alerts", timeout=30)
    assert r.status_code == 200
    docs = r.json()
    assert isinstance(docs, list)
    assert len(docs) >= 1
    # ensure desc by timestamp
    timestamps = [d["timestamp"] for d in docs]
    assert timestamps == sorted(timestamps, reverse=True)


# ---------- Refresh mutates ----------
def test_refresh_mutates(session):
    r1 = session.get(f"{API}/nodes", timeout=30).json()
    earn_before = sum(n["earnings_myst"] for n in r1)
    r2 = session.post(f"{API}/refresh", timeout=30)
    assert r2.status_code == 200
    assert r2.json() == {"ok": True}
    r3 = session.get(f"{API}/nodes", timeout=30).json()
    earn_after = sum(n["earnings_myst"] for n in r3)
    assert earn_before != earn_after  # values mutated


# ---------- AI Chat ----------
def test_ai_chat_and_history(session):
    sid = f"TEST_{uuid.uuid4()}"
    payload = {"session_id": sid, "message": "How many nodes are online right now? Give a one-sentence answer."}
    r = session.post(f"{API}/ai/chat", json=payload, timeout=120)
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:200]}"
    d = r.json()
    assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 0
    # history
    time.sleep(0.5)
    r2 = session.get(f"{API}/ai/history/{sid}", timeout=30)
    assert r2.status_code == 200
    msgs = r2.json()
    roles = [m["role"] for m in msgs]
    assert "user" in roles and "assistant" in roles
    assert len(msgs) >= 2


# ---------- AI Insights ----------
def test_ai_insights(session):
    r = session.post(f"{API}/ai/insights", timeout=120)
    assert r.status_code == 200, f"body={r.text[:200]}"
    d = r.json()
    assert "insights" in d
    insights = d["insights"]
    assert isinstance(insights, list)
    assert 1 <= len(insights) <= 10
    for ins in insights:
        assert "severity" in ins
        assert "title" in ins
        assert "detail" in ins


# ---------- AI Forecast ----------
def test_ai_forecast(session):
    r = session.post(f"{API}/ai/forecast?days=7", timeout=120)
    assert r.status_code == 200, f"body={r.text[:200]}"
    d = r.json()
    assert "forecast" in d
    assert "summary" in d
