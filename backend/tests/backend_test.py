"""Backend tests for Money Making Mining Rigs API."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://crypto-rigs-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_COIN_SYMBOLS = {"BTC", "LTC", "KAS", "RVN", "ETC", "ZEC", "DASH", "XMR", "ALPH"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --------- Health ---------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("service") == "mining-rigs-api"


# --------- /api/coins ---------
class TestCoins:
    def test_coins_list(self, session):
        r = session.get(f"{API}/coins")
        assert r.status_code == 200
        coins = r.json()
        assert isinstance(coins, list)
        assert len(coins) == 9
        symbols = {c["symbol"] for c in coins}
        assert symbols == EXPECTED_COIN_SYMBOLS
        for c in coins:
            for k in ["cg_id", "symbol", "name", "algo", "unit",
                      "network_hashrate", "block_reward", "blocks_per_day",
                      "price_usd", "change_24h", "market_cap", "merge_rewards"]:
                assert k in c, f"Missing key {k} in coin {c.get('symbol')}"
            # Live price should be > 0 for at least most coins
        prices_with_data = [c for c in coins if c["price_usd"] > 0]
        assert len(prices_with_data) >= 7, f"Too few live prices: {len(prices_with_data)}"

    def test_litecoin_has_doge_merge(self, session):
        r = session.get(f"{API}/coins")
        ltc = next(c for c in r.json() if c["symbol"] == "LTC")
        merges = ltc["merge_rewards"]
        assert any(m["symbol"] == "DOGE" for m in merges)


# --------- /api/rigs ---------
class TestRigs:
    def test_all_rigs(self, session):
        r = session.get(f"{API}/rigs", params={"electricity": 0.10, "profitable_only": False})
        assert r.status_code == 200
        rigs = r.json()
        assert len(rigs) == 23
        for rig in rigs:
            for k in ["id", "name", "algo", "coin_id", "hashrate", "power_w",
                      "price_usd", "revenue_usd_day", "power_cost_usd_day",
                      "profit_usd_day", "is_profitable", "revenue_breakdown"]:
                assert k in rig

    def test_profitable_only_filter(self, session):
        r = session.get(f"{API}/rigs", params={"electricity": 0.10, "profitable_only": True})
        assert r.status_code == 200
        rigs = r.json()
        assert len(rigs) > 0, "No profitable rigs returned"
        for rig in rigs:
            assert rig["profit_usd_day"] > 0
            assert rig["is_profitable"] is True
        # Sorted descending by profit
        profits = [r["profit_usd_day"] for r in rigs]
        assert profits == sorted(profits, reverse=True)

    def test_filter_by_algo_sha256(self, session):
        r = session.get(f"{API}/rigs", params={"algo": "sha256", "profitable_only": False})
        assert r.status_code == 200
        rigs = r.json()
        assert len(rigs) > 0
        for rig in rigs:
            assert rig["algo"] == "sha256"
            assert rig["coin_id"] == "bitcoin"

    def test_sort_by_roi(self, session):
        r = session.get(f"{API}/rigs", params={"sort": "roi", "profitable_only": True})
        assert r.status_code == 200
        rigs = r.json()
        rois = [(rig["roi_year_pct"] or -1) for rig in rigs]
        assert rois == sorted(rois, reverse=True)

    def test_sort_by_payback(self, session):
        r = session.get(f"{API}/rigs", params={"sort": "payback", "profitable_only": True})
        assert r.status_code == 200
        rigs = r.json()
        paybacks = [(rig["payback_days"] or 1e12) for rig in rigs]
        assert paybacks == sorted(paybacks)

    def test_sort_by_price(self, session):
        r = session.get(f"{API}/rigs", params={"sort": "price", "profitable_only": False})
        assert r.status_code == 200
        rigs = r.json()
        prices = [rig["price_usd"] for rig in rigs]
        assert prices == sorted(prices)


# --------- /api/rigs/{id} ---------
class TestRigDetail:
    def test_known_rig(self, session):
        r = session.get(f"{API}/rigs/antminer-ks5-pro")
        assert r.status_code == 200
        rig = r.json()
        assert rig["id"] == "antminer-ks5-pro"
        assert rig["coin_id"] == "kaspa"
        assert "revenue_breakdown" in rig
        assert len(rig["revenue_breakdown"]) >= 1

    def test_ltc_rig_has_doge_breakdown(self, session):
        r = session.get(f"{API}/rigs/antminer-l9")
        assert r.status_code == 200
        rig = r.json()
        symbols = {b["symbol"] for b in rig["revenue_breakdown"]}
        assert "LTC" in symbols
        assert "DOGE" in symbols

    def test_invalid_rig_returns_404(self, session):
        r = session.get(f"{API}/rigs/does-not-exist")
        assert r.status_code == 404


# --------- /api/calculate ---------
class TestCalculate:
    def test_calc_btc(self, session):
        body = {
            "coin_id": "bitcoin",
            "hashrate": 200.0,
            "power_w": 3500,
            "rig_price_usd": 3290,
            "electricity_usd_kwh": 0.10,
        }
        r = session.post(f"{API}/calculate", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["coin_id"] == "bitcoin"
        assert d["coin_symbol"] == "BTC"
        for k in ["revenue_usd_day", "power_cost_usd_day", "profit_usd_day",
                  "profit_usd_month", "profit_usd_year", "is_profitable",
                  "revenue_breakdown"]:
            assert k in d
        # Sanity: power cost = 3.5 kW * 24 * 0.10 = 8.4
        assert abs(d["power_cost_usd_day"] - 8.4) < 0.001

    def test_calc_invalid_coin(self, session):
        body = {
            "coin_id": "dogecoinx",
            "hashrate": 100.0,
            "power_w": 1000,
            "rig_price_usd": 1000,
            "electricity_usd_kwh": 0.10,
        }
        r = session.post(f"{API}/calculate", json=body)
        assert r.status_code == 400

    def test_calc_negative_inputs_rejected(self, session):
        body = {
            "coin_id": "bitcoin",
            "hashrate": -5,
            "power_w": 100,
            "rig_price_usd": 100,
            "electricity_usd_kwh": 0.10,
        }
        r = session.post(f"{API}/calculate", json=body)
        assert r.status_code == 422


# --------- /api/stats ---------
class TestStats:
    def test_stats(self, session):
        r = session.get(f"{API}/stats", params={"electricity": 0.10})
        assert r.status_code == 200
        d = r.json()
        for k in ["btc_price", "btc_change_24h", "total_rigs", "profitable_rigs",
                  "unprofitable_rigs", "top_rig_id", "top_rig_name",
                  "top_rig_profit_day", "best_coin_by_roi", "best_roi_year_pct",
                  "electricity", "bsc_block_number"]:
            assert k in d
        assert d["total_rigs"] == 23
        assert d["profitable_rigs"] + d["unprofitable_rigs"] == 23
        # NodeReal block number must be a positive int (NodeReal integration)
        assert d["bsc_block_number"] is not None, "NodeReal RPC failed"
        assert isinstance(d["bsc_block_number"], int)
        assert d["bsc_block_number"] > 0
        # BTC price live
        assert d["btc_price"] > 0
