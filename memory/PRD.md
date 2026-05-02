# Mystnodes Monitor — PRD

## Original Problem Statement
> https://mystnodes-monitor-copy-37afa777.base44.app — Help me touch up my app make the AI more capable.

The original is hosted externally on Base44. We rebuilt a premium successor on Emergent with a sharper design and a materially more capable AI copilot.

## Architecture
- **Frontend**: React (CRA + Craco), Tailwind, Recharts, Phosphor Icons
- **Backend**: FastAPI (async) + Motor + MongoDB
- **AI**: Claude Sonnet 4.5 via `emergentintegrations` (Emergent Universal LLM Key)
- **Data**: 12 mock Mystnodes seeded on startup; 30 days of aggregate history; 6 alerts

## User Personas
- **Node operator**: Runs multiple Mystnodes, wants earnings visibility, uptime monitoring, optimization tips.
- **Power operator / investor**: Manages fleet, wants forecasts and anomaly detection.

## Core Requirements (static)
1. Fleet overview (earnings, active/degraded/offline, bandwidth, sessions, avg uptime/quality)
2. Per-node visibility (status, earnings, uptime, bandwidth, sessions, location, quality, version, IP, identity)
3. Time-series charts (30d earnings area + 30d bandwidth bars)
4. Alerts / event feed (severity, node, message, rel-time)
5. **AI Copilot chat** — multi-turn, persistent, grounded in live fleet data
6. **AI Insights** — one-click fleet analysis returning prioritized, node-referenced recommendations
7. **AI Forecast** — N-day MYST earnings projection
8. Live refresh (simulated metric updates)
9. Node detail view with 30d earnings line chart

## Implemented (2026-05-02)
- Full backend API: `/api/overview`, `/api/nodes`, `/api/nodes/{id}`, `/api/history`, `/api/alerts`, `/api/refresh`, `/api/ai/chat`, `/api/ai/insights`, `/api/ai/forecast`, `/api/ai/history/{session_id}`
- Chat messages persisted in `chat_messages` collection per session
- Dark terminal retro-futurism UI (obsidian + neon lime + cyan; Clash Display / Satoshi / JetBrains Mono)
- Sticky header with pulsing live indicator, Refresh, AI Copilot
- OverviewStats (4 cards), EarningsChart (area), BandwidthChart (bars)
- NodeGrid (clickable cards with status dots, flags, metrics), NodeDetailModal with 30d line chart
- AIInsights panel with shimmer border and severity icons
- AIChatDrawer with terminal-style bubbles, suggestions, history replay
- AlertsFeed with severity icons and relative time
- 100% backend tests (10/10) and 100% frontend flows passing

## Prioritized Backlog
### P0 (none outstanding)
### P1
- Wire real Mystnodes / Mysterium API (requires operator credentials)
- Streaming chat responses (token-by-token)
- AI Forecast widget on dashboard (endpoint exists, no UI yet)
- Authentication (JWT or Emergent Google Auth) to support multi-operator tenancy
### P2
- WebSocket live-update stream (replace manual Refresh)
- Export CSV for earnings history
- Telegram/Discord alert delivery
- Per-node deep diagnostics (whois, traceroute stubs)
- Dark/Light theme toggle
- Mobile-optimized layout polish

## Next Action Items
- Integrate real Mystnodes API once credentials are available
- Optionally add streaming chat + AI forecast card to dashboard
