# Mystnodes Monitor — PRD

## Original Problem Statement
> https://mystnodes-monitor-copy-37afa777.base44.app — Help me touch up my app and make the AI more capable.

Follow-up: "Make sure crypto mining is making optimal profit + auto-withdrawal to the same wallet."

## Architecture
- **Frontend**: React (CRA + Craco), Tailwind, Recharts, Phosphor Icons
- **Backend**: FastAPI (async) + Motor + MongoDB
- **AI**: Claude Sonnet 4.5 via `emergentintegrations` (Emergent Universal LLM Key)
- **Crypto**: Polygon MYST ERC-20 (`0x1379...D9F3`); deep-link to Polygonscan for on-chain history

## User Personas
- **Node operator**: Runs multiple Mystnodes, wants earnings visibility, uptime monitoring, optimization tips.
- **Power operator / investor**: Manages a fleet, needs forecasts, anomaly detection, and auto-withdrawal assurance.

## Core Requirements
1. Fleet overview (earnings, active/degraded/offline, bandwidth, sessions, avg uptime/quality)
2. Per-node visibility and detail view with 30d history
3. Earnings + bandwidth time-series charts
4. Event/alerts feed
5. AI Copilot chat — multi-turn, grounded in live fleet data
6. AI Insights — one-click fleet analysis with prioritized recommendations
7. AI Forecast — N-day MYST earnings projection
8. AI Profit Optimizer — ranked playbook (RESTART/RELOCATE/PRICING/HARDWARE/NETWORK/SETTLEMENT) with expected MYST uplift
9. Wallet & Auto-Withdrawal panel — stores wallet + API key, renders exact per-node CLI commands, Polygonscan deep-link, recent settlement preview

## Implemented (2026-05-02)
### Iteration 1 (Touch-up + Core AI)
- Full backend: `/api/overview`, `/api/nodes`, `/api/nodes/{id}`, `/api/history`, `/api/alerts`, `/api/refresh`, `/api/ai/chat` (multi-turn, persisted), `/api/ai/insights`, `/api/ai/forecast`, `/api/ai/history/{session_id}`
- Dark "terminal retro-futurism" UI (Clash Display / Satoshi / JetBrains Mono)
- Dashboard, overview stats, earnings/bandwidth charts, node grid, node-detail modal, AI insights, alerts feed, AI chat drawer

### Iteration 2 (Optimal Profit + Auto-Withdrawal)
- `/api/settings` (GET): returns wallet, masked API key, threshold (5 MYST), Polygonscan URL, and the 4 copy-paste CLI commands to configure auto-withdrawal on each node (`mmn <key>`, `myst cli identities beneficiary-set <wallet>`, `identities settle`, `identities get`)
- `/api/settings` (POST): persists threshold/wallet overrides to `db.settings` (round-trip read not wired yet — see backlog)
- `/api/withdrawals`: simulated recent settlements derived from history + Polygonscan deep-link for real on-chain data
- `/api/ai/profit-optimizer`: Claude Sonnet 4.5 returns 5–8 ranked actions with category, target node, expected MYST uplift, effort; tested endpoint produced +45% uplift recommendation
- Frontend: `WalletPanel` (CONFIGURED badge, wallet address, masked key, 4 copyable CLI commands, auto-settlement preview, Polygonscan link), `ProfitOptimizerModal` (full-screen, stat tiles + ranked action cards), new header button "Optimize Profit"
- Env: `MYSTNODES_API_KEY`, `PAYOUT_WALLET`, `WITHDRAWAL_THRESHOLD_MYST`, `MYST_TOKEN_POLYGON`

## Testing
- Backend: 14/14 pytest passing (10 core + 4 wallet/profit)
- Frontend: 100% of user flows validated via automation (no console errors)

## Known Limitations
- **Mystnodes has no cloud REST API** — real-time fleet data requires a bridge agent on each node hitting TequilAPI. Current data is MOCKED/seeded.
- Auto-withdrawal is configured **per-node** via the CLI commands we generate (user runs them once per node). The monitor itself doesn't trigger withdrawals.
- `POST /api/settings` persists overrides, but `GET /api/settings` reads from `.env` — round-trip not yet wired.
- AI Profit Optimizer has no result caching — each open re-runs a ~30s LLM call.

## Prioritized Backlog
### P1
- Wire `GET /api/settings` to prefer `db.settings` over env (round-trip)
- Cache Profit Optimizer / Insights results for 5 min
- Lightweight agent / TequilAPI bridge (on-node) to push real earnings/uptime to this backend
- AI Forecast dashboard card (endpoint exists)
- Streaming chat responses (token-by-token)
- Error state on WalletPanel when `/api/settings` fails

### P2
- Real-time Polygonscan MYST transfer fetch via on-chain RPC (needs API key) to replace simulated withdrawal feed
- Authentication (JWT or Emergent Google) for multi-operator tenancy
- Telegram/Discord alert delivery; CSV export
- WebSocket live metrics
- Mobile polish; light theme
- Never include raw API key in `commands[0].cmd` response — require user to re-paste or fetch client-side

## Next Action Items
- Share each node's CLI commands (already visible in the Wallet panel) — paste into each node's shell to enable auto-withdrawal to `0xbaa9…6bec`
- Provide Mystnodes REST bridge credentials if you'd like real (not seeded) data
