#!/usr/bin/env python3
"""
Mystnodes Monitor - Bridge Agent
================================
Runs on each Mysterium node. Pulls live metrics from the node's TequilAPI
(http://127.0.0.1:4050) and pushes them to the central Mystnodes Monitor
dashboard every 60 seconds.

INSTALL (on each node):
  wget https://<YOUR_MONITOR_URL>/static/bridge_agent.py -O /usr/local/bin/mm-bridge
  chmod +x /usr/local/bin/mm-bridge
  export MONITOR_URL="https://<YOUR_MONITOR_URL>"
  export INGEST_SECRET="mm_ingest_7f3a9c2e5b14d6a8"
  export TEQUILAPI_USER="myst"
  export TEQUILAPI_PASS="mystberry"
  export NODE_NAME="titan-01"          # optional; defaults to hostname
  /usr/local/bin/mm-bridge

Or drop in /etc/systemd/system/mm-bridge.service (recommended). Template at bottom.
"""
import os
import sys
import time
import json
import socket
import argparse
import base64
from urllib import request as urlreq, error as urlerr


def _basic(u: str, p: str) -> str:
    return "Basic " + base64.b64encode(f"{u}:{p}".encode()).decode()


def _get(url: str, auth: str, timeout: int = 8):
    req = urlreq.Request(url, headers={"Authorization": auth, "Accept": "application/json"})
    with urlreq.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def _post(url: str, secret: str, body: dict, timeout: int = 10):
    data = json.dumps(body).encode()
    req = urlreq.Request(url, data=data, method="POST", headers={
        "Content-Type": "application/json",
        "X-Ingest-Secret": secret,
    })
    with urlreq.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def collect(tequila_base: str, auth: str) -> dict:
    """Collect metrics from TequilAPI. Returns dict ready for ingest."""
    # identities → first one
    ids = _get(f"{tequila_base}/identities", auth).get("identities", [])
    if not ids:
        raise RuntimeError("No identities on node")
    ident = ids[0].get("id", "0x0")

    # earnings / services / sessions - best-effort, TequilAPI shape may vary per version
    earnings_myst = 0.0
    uptime_pct = 100.0
    bandwidth_gb = 0.0
    sessions = 0
    quality = 7.0

    try:
        services = _get(f"{tequila_base}/services", auth)
        if isinstance(services, list):
            sessions = sum(int(s.get("sessions_count", 0) or 0) for s in services)
    except Exception:
        pass

    try:
        stats = _get(f"{tequila_base}/node/provider/sessions?date_from=", auth)
        if isinstance(stats, dict):
            earnings_myst = float(stats.get("totalEarnings", 0) or stats.get("earnings", 0) or 0)
            bandwidth_gb = float(stats.get("totalTransferredBytes", 0) or 0) / (1024 ** 3)
    except Exception:
        pass

    try:
        q = _get(f"{tequila_base}/node/provider/quality", auth)
        if isinstance(q, dict):
            quality = float(q.get("quality", 7.0) or 7.0)
    except Exception:
        pass

    # Approximate status: if we got this far, node responded → online
    status = "online"
    return {
        "identity": ident,
        "name": os.environ.get("NODE_NAME") or socket.gethostname(),
        "status": status,
        "uptime_pct": float(uptime_pct),
        "earnings_myst": round(earnings_myst, 4),
        "bandwidth_gb": round(bandwidth_gb, 2),
        "sessions": int(sessions),
        "quality_score": round(quality, 2),
        "version": os.environ.get("NODE_VERSION", "unknown"),
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--monitor", default=os.environ.get("MONITOR_URL", ""))
    p.add_argument("--secret", default=os.environ.get("INGEST_SECRET", ""))
    p.add_argument("--tequila", default=os.environ.get("TEQUILAPI_URL", "http://127.0.0.1:4050"))
    p.add_argument("--user", default=os.environ.get("TEQUILAPI_USER", "myst"))
    p.add_argument("--password", default=os.environ.get("TEQUILAPI_PASS", "mystberry"))
    p.add_argument("--interval", type=int, default=int(os.environ.get("INTERVAL", "60")))
    args = p.parse_args()

    if not args.monitor or not args.secret:
        print("ERROR: --monitor and --secret are required (or set MONITOR_URL + INGEST_SECRET)", file=sys.stderr)
        sys.exit(1)

    ingest_url = args.monitor.rstrip("/") + "/api/ingest/node"
    auth = _basic(args.user, args.password)
    print(f"[mm-bridge] → {ingest_url} every {args.interval}s")

    last_status = "unknown"
    while True:
        try:
            payload = collect(args.tequila, auth)
            resp = _post(ingest_url, args.secret, payload)
            print(f"[mm-bridge] push ok: {payload['name']} status={payload['status']} earn={payload['earnings_myst']} MYST")
            last_status = payload["status"]
        except urlerr.URLError as e:
            # Node unreachable → tell monitor it's offline
            try:
                _post(ingest_url, args.secret, {
                    "identity": os.environ.get("NODE_IDENTITY", f"offline-{socket.gethostname()}"),
                    "name": os.environ.get("NODE_NAME") or socket.gethostname(),
                    "status": "offline",
                    "uptime_pct": 0.0, "earnings_myst": 0.0, "bandwidth_gb": 0.0, "sessions": 0,
                })
            except Exception:
                pass
            print(f"[mm-bridge] tequilapi unreachable: {e}", file=sys.stderr)
        except Exception as e:
            print(f"[mm-bridge] error: {e}", file=sys.stderr)
        time.sleep(args.interval)


SYSTEMD_UNIT = """# /etc/systemd/system/mm-bridge.service
[Unit]
Description=Mystnodes Monitor Bridge Agent
After=network.target mysterium-node.service

[Service]
Type=simple
Environment=MONITOR_URL=https://YOUR_MONITOR_URL
Environment=INGEST_SECRET=mm_ingest_7f3a9c2e5b14d6a8
Environment=TEQUILAPI_USER=myst
Environment=TEQUILAPI_PASS=mystberry
ExecStart=/usr/local/bin/mm-bridge
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--print-systemd":
        print(SYSTEMD_UNIT)
        sys.exit(0)
    main()
