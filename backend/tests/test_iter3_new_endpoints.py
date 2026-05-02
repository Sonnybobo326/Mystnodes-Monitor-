"""Iteration 3 backend tests: price, on-chain, ingest, telegram, bridge."""
import os
import pytest
import requests

BASE_URL = os.environ.get('PUBLIC_BACKEND_URL') or os.environ.get('REACT_APP_BACKEND_URL') or 'https://ai-monitor-tune.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')
INGEST_SECRET = "mm_ingest_7f3a9c2e5b14d6a8"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- Price ----
class TestPrice:
    def test_price_myst(self, s):
        r = s.get(f"{BASE_URL}/api/price/myst", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["symbol"] == "MYST"
        assert isinstance(d["usd"], (int, float)) and d["usd"] > 0
        assert "change_24h_pct" in d and isinstance(d["change_24h_pct"], (int, float))
        assert d["source"] == "coingecko"

    def test_overview_includes_price(self, s):
        r = s.get(f"{BASE_URL}/api/overview", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "myst_price_usd" in d and d["myst_price_usd"] > 0
        assert "myst_price_change_24h_pct" in d
        # total_earnings_usd ≈ total_earnings_myst * myst_price_usd (within tolerance for rounding)
        expected = round(d["total_earnings_myst"] * d["myst_price_usd"], 2)
        assert abs(d["total_earnings_usd"] - expected) < max(1.0, expected * 0.02)


# ---- On-chain withdrawals ----
class TestOnchain:
    def test_onchain_withdrawals(self, s):
        r = s.get(f"{BASE_URL}/api/onchain/withdrawals", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["wallet"].lower().startswith("0xbaa9")
        assert isinstance(d["withdrawals"], list)
        assert "incoming_count" in d
        assert "total_myst_received" in d
        assert "total_usd_received" in d
        assert "polygon_scan_url" in d and "polygonscan.com" in d["polygon_scan_url"]
        assert "blockscout_url" in d and "blockscout" in d["blockscout_url"]
        assert d["source"] == "blockscout-polygon"


# ---- Ingest ----
class TestIngest:
    payload = {
        "identity": "0xTEST_ingest_iter3_aaaa",
        "name": "TEST_ingest_iter3",
        "status": "online",
        "uptime_pct": 99.5,
        "earnings_myst": 12.34,
        "bandwidth_gb": 50.0,
        "sessions": 100,
        "ip": "1.2.3.4",
        "version": "1.21.2",
        "country": "Germany",
        "country_code": "DE",
        "city": "Berlin",
        "quality_score": 8.5,
    }

    def test_ingest_without_secret_401(self, s):
        r = s.post(f"{BASE_URL}/api/ingest/node", json=self.payload, timeout=10)
        assert r.status_code == 401

    def test_ingest_with_secret_ok_and_offline_alert(self, s):
        # online ingest first
        r = s.post(f"{BASE_URL}/api/ingest/node", json=self.payload,
                   headers={"X-Ingest-Secret": INGEST_SECRET}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert "id" in d and len(d["id"]) > 0
        node_id = d["id"]

        # second ingest same identity should upsert (same id)
        r2 = s.post(f"{BASE_URL}/api/ingest/node", json=self.payload,
                    headers={"X-Ingest-Secret": INGEST_SECRET}, timeout=15)
        assert r2.json()["id"] == node_id

        # transition online->offline -> alert created
        offline_payload = {**self.payload, "status": "offline"}
        r3 = s.post(f"{BASE_URL}/api/ingest/node", json=offline_payload,
                    headers={"X-Ingest-Secret": INGEST_SECRET}, timeout=15)
        assert r3.status_code == 200

        # check alerts contains a critical message for this node
        ar = s.get(f"{BASE_URL}/api/alerts", timeout=10)
        assert ar.status_code == 200
        alerts = ar.json()
        assert any(a.get("node_id") == node_id and a.get("severity") == "critical"
                   for a in alerts), "no critical offline alert created"


# ---- Bridge install/download ----
class TestBridge:
    def test_bridge_install(self, s):
        r = s.get(f"{BASE_URL}/api/bridge/install", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["ingest_secret"] == INGEST_SECRET
        assert "monitor_url" in d and d["monitor_url"].startswith("http")
        assert "/api/bridge/download" in d["download_url"]
        assert "curl" in d["one_line_install"] and "mm-bridge" in d["one_line_install"]
        assert "[Unit]" in d["systemd_unit"] and "ExecStart" in d["systemd_unit"]

    def test_bridge_download(self, s):
        r = s.get(f"{BASE_URL}/api/bridge/download", timeout=10)
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "text/x-python" in ctype or "text/plain" in ctype
        assert "Mystnodes Monitor - Bridge Agent" in r.text


# ---- Telegram (unconfigured) ----
class TestTelegram:
    def test_status_unconfigured(self, s):
        r = s.get(f"{BASE_URL}/api/telegram/status", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["configured"] is False
        assert d["bot_set"] is False
        assert d["chat_set"] is False

    def test_test_unconfigured(self, s):
        r = s.post(f"{BASE_URL}/api/telegram/test", json={}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is False
        assert "TELEGRAM_BOT_TOKEN" in d.get("reason", "")
