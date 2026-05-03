# RIG.PROFIT — Money Making Mining Rigs

## Original problem statement
> 88bca44fd37f452d8c8ec0f62e788ae2 https://nodereal.io/invite/ddde8b49-3b18-4f3c-a061-73c3db167c71
> I want money making mining rigs, if its not profitable, don't put it on there

## User personas
- Crypto miner / hobbyist evaluating which ASIC/GPU rig still earns at their power rate
- Investor doing ROI/payback math before buying hardware
- Operator monitoring profitability across coins/algorithms

## Core requirements (locked)
- Real-time profitability dashboard, calculator, and rig catalog combined
- Live coin prices (CoinPaprika primary; CoinGecko was rate-limited from this IP)
- NodeReal API for blockchain RPC enrichment (BSC block number)
- Default filter: only rigs profitable at $0.10/kWh ("if it's not profitable, don't put it on there")
- Modern fintech dashboard aesthetic — Manrope + IBM Plex Sans + JetBrains Mono, sharp 0px corners, emerald accents

## What's been implemented (2026-02)
- Backend (FastAPI):
  - `mining_data.py` — 9 mining coins (BTC, LTC, KAS, RVN, ETC, ZEC, DASH, XMR, ALPH) with realistic Feb 2026 network params; 23 rigs (ASIC + GPU + CPU)
  - `GET /api/coins` — coin list with live prices, market cap, network HR, block reward, merge rewards (DOGE for LTC)
  - `GET /api/rigs` — sortable, algo-filterable, profitable_only toggle
  - `GET /api/rigs/{id}` — rig detail with revenue breakdown (incl. merge mining)
  - `POST /api/calculate` — custom hashrate/power/price/electricity profit calc
  - `GET /api/stats` — KPIs (BTC price, top rig, best ROI, profitable count, BSC block)
  - CoinPaprika async parallel fetch + in-memory 60s cache
  - NodeReal BSC RPC for `bsc_block_number`
- Frontend (React):
  - `/` Dashboard — hero + electricity slider + KPI strip + Top Profitable Rigs leaderboard + live coin table
  - `/rigs` — full sortable catalog with algo filter and profitable-only toggle
  - `/rig/:id` — stats grid, recharts P&L bar chart, per-coin output breakdown
  - `/calculator` — auto-recalculating custom profit calculator
  - `/coins` — coin cards with merge-mining badges
  - Header navigation with brand mark; light Swiss/High-Contrast theme
- Testing: 16/16 backend pytest passed; all frontend critical flows verified

## Known minor items (P2)
- Cosmetic React hydration warning about `<span>` in `<option>` from build-time tooling (not our code)
- /api/stats fires NodeReal RPC each request (could be cached)

## Backlog
- P1: Persist user-saved calculator runs to MongoDB; export PDF/CSV
- P1: Historical profitability chart per rig (30/90 day)
- P2: Affiliate "Buy on …" links for revenue
- P2: Email alerts when a rig flips into/out of profit
- P2: Custom pool fee + uptime % inputs
