# NodeManager — Mobile App Prototype
### Myst Nodes + Tailscale Devices in One Dashboard

A dark-mode, native-feeling **mobile app prototype** that unifies:
- **Myst VPN nodes** deployed via AWS CloudFormation (Phase 1 YAML)
- **Tailscale devices** from your personal tailnet

---

## ✅ Completed Features

### Screens
| Screen | Content |
|---|---|
| **Dashboard** | Summary cards (total online, MYST today, Tailscale count), earnings chart, Myst nodes, Tailscale devices, quick actions, activity feed |
| **All Nodes** | Unified list with source filter (All / Myst / Tailscale / Online / Offline), color-coded by type |
| **Node Detail — Myst** | IP, uptime, CPU/RAM/BW bars, per-node earnings, Start/Stop/Restart controls, logs |
| **Node Detail — Tailscale** | Tailscale IP, OS icon, user, key expiry, authorized status, client version, update indicator |
| **Earnings** | Period selector, stacked bar chart by node, session log |
| **Wallet & Payouts** | MYST balance, payout history, pending progress |
| **Logs** | Terminal-style Myst log viewer |
| **Settings** | Tailscale API info, AWS config, wallet, notification toggles |

### Tailscale Integration
- ✅ API key stored: `tskey-api-kG84DPchWR11CNTRL-…`
- ✅ Devices cached in Table API (`tailscale_devices` table)
- ✅ Online detection: device seen within last 10 minutes = online
- ✅ OS icons (Linux, macOS, Windows, iOS, Android, etc.)
- ✅ **Import button** — paste your `curl` API response to sync devices
- ✅ Auto-renders into Dashboard and Nodes tab immediately after import
- ✅ Displays: hostname, Tailscale IP, OS, user, authorized, key expiry, client version

### Why not live API calls?
Tailscale's REST API enforces strict CORS headers and blocks all browser-originated requests (this is intentional security behaviour). The app works around this with a **persistent device cache** in the Table API — import once, persists across sessions.

### How to import your Tailscale devices
1. Run in terminal:
   ```bash
   curl -s "https://api.tailscale.com/api/v2/tailnet/-/devices?fields=all" \
     -H "Authorization: Bearer tskey-api-kG84DPchWR11CNTRL-8dvBGwp2uQAEJUimnz3LRAufenQZ4iuq"
   ```
2. Copy the full JSON output
3. In the app → tap **Import Devices** button → paste → tap **Import**

---

## 🗂 File Structure
```
index.html          App shell (all screens + modals)
css/style.css       Dark design system (Myst purple + Tailscale teal)
js/tailscale.js     Tailscale API layer + Table API cache
js/app.js           Navigation, charts, node detail, interactions
```

## 🛢 Data Storage
| Table | Fields |
|---|---|
| `tailscale_devices` | id, name, hostname, os, tailscale_ip, all_addresses, last_seen, authorized, key_expiry_disabled, expiry, user, client_version, update_available, tags, enabled_routes, node_key |

---

## 🏗 AWS Myst Infrastructure
- **2 × EC2 t3.small** · VPC 10.0.0.0/16 · us-east-1a
- **Ports**: TCP 4449 (Myst API), UDP 1194 (OpenVPN), TCP 22 (SSH)
- Simulated IPs: `3.91.192.45`, `54.210.33.17`

---

## 🔜 Next Steps
1. Wrap in a small Express/Node.js proxy to enable live Tailscale API calls
2. Connect to real Myst node API (port 4449) for live node status
3. Add authentication screen
4. Package as React Native / Flutter app
