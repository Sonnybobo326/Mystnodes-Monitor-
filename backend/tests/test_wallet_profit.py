"""Tests for wallet/withdrawal/profit-optimizer endpoints (iteration 2)."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or "http://localhost:8001"
# REACT_APP_BACKEND_URL lives in frontend/.env; for backend tests fall back to public URL via env or localhost
# Prefer the public REACT_APP_BACKEND_URL if exported
PUBLIC = os.environ.get('PUBLIC_BACKEND_URL')
if PUBLIC:
    BASE_URL = PUBLIC.rstrip('/')


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- /api/settings ----
class TestSettings:
    def test_get_settings(self, s):
        r = s.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["configured"] is True
        assert d["wallet"] == "0xbaa9c0a1120427d79d20afca66fca7b7f64e6bec"
        assert d["threshold_myst"] == 5 or d["threshold_myst"] == 5.0
        assert d["api_key_masked"].startswith("b63L")
        assert d["api_key_masked"].endswith("T8xB")
        assert d["polygon_scan_url"]
        assert isinstance(d["commands"], list) and len(d["commands"]) == 4
        for c in d["commands"]:
            assert "label" in c and "cmd" in c
            assert c["label"] and c["cmd"]

    def test_post_settings_upsert(self, s):
        payload = {"wallet": "0xbaa9c0a1120427d79d20afca66fca7b7f64e6bec", "threshold_myst": 5}
        r = s.post(f"{BASE_URL}/api/settings", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["wallet"] == payload["wallet"]
        assert float(d["threshold_myst"]) == 5.0


# ---- /api/withdrawals ----
class TestWithdrawals:
    def test_get_withdrawals(self, s):
        r = s.get(f"{BASE_URL}/api/withdrawals", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["wallet"] == "0xbaa9c0a1120427d79d20afca66fca7b7f64e6bec"
        assert isinstance(d["withdrawals"], list)
        assert len(d["withdrawals"]) > 0
        assert "pending_myst" in d
        assert d["polygon_scan_url"]
        # validate item shape
        first = d["withdrawals"][0]
        for k in ("date", "amount_myst", "tx_hash_preview", "status"):
            assert k in first


# ---- /api/ai/profit-optimizer (live LLM) ----
class TestProfitOptimizer:
    def test_profit_optimizer(self, s):
        r = s.post(f"{BASE_URL}/api/ai/profit-optimizer", timeout=180)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        # required top-level fields
        for k in ("estimated_current_monthly_myst", "estimated_optimized_monthly_myst",
                  "uplift_pct", "headline", "actions"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["actions"], list)
        assert 5 <= len(d["actions"]) <= 8, f"expected 5-8 actions, got {len(d['actions'])}"
        for a in d["actions"]:
            for fld in ("priority", "category", "target_node", "action",
                        "rationale", "expected_myst_delta_monthly", "effort"):
                assert fld in a, f"action missing {fld}: {a}"
            assert a["category"] in {"RESTART", "RELOCATE", "PRICING", "HARDWARE", "NETWORK", "SETTLEMENT"}
            assert a["effort"] in {"LOW", "MEDIUM", "HIGH"}
