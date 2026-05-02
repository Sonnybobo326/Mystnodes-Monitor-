import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Broadcast, Copy, CheckCircle, Download } from "@phosphor-icons/react";

export default function BridgeInstallPanel() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.get("/bridge/install").then(r => {
      const origin = window.location.origin;
      const d = r.data || {};
      // Ensure URLs use the public origin (backend sees internal base)
      const download = `${origin}/api/bridge/download`;
      const install =
        `curl -fsSL ${download} -o /usr/local/bin/mm-bridge && chmod +x /usr/local/bin/mm-bridge && ` +
        `MONITOR_URL=${origin} INGEST_SECRET=${d.ingest_secret} nohup /usr/local/bin/mm-bridge >/var/log/mm-bridge.log 2>&1 &`;
      const systemd = (d.systemd_unit || "").replace(/Environment=MONITOR_URL=.*/g, `Environment=MONITOR_URL=${origin}`);
      setData({ ...d, download_url: download, one_line_install: install, systemd_unit: systemd, monitor_url: origin });
    }).catch(console.error);
  }, []);

  const copy = async (k, v) => {
    try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1400); } catch {}
  };

  if (!data) return null;

  return (
    <div className="border border-white/10 bg-surface rounded-sm p-5" data-testid="bridge-install-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Broadcast size={16} className="text-lime" weight="fill" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-lime">Connect Real Nodes</div>
        </div>
        <a href={data.download_url} download className="font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-lime flex items-center gap-1" data-testid="download-bridge-btn">
          <Download size={11} /> bridge_agent.py
        </a>
      </div>
      <div className="font-body text-xs text-white/70 leading-relaxed mb-3">
        Deploy this 150-line Python agent on each Mystnode (Linux, ~2 MB RAM) to push <strong>real</strong> TequilAPI metrics (earnings, uptime, sessions, quality) to this dashboard every 60 s. Mock data is replaced with your actual fleet.
      </div>
      <div className="border border-white/10 bg-black/70 rounded-sm">
        <div className="px-3 pt-2 font-body text-[11px] text-white/50">One-line install (run as root on each node):</div>
        <div className="flex items-start justify-between gap-2 px-3 py-2">
          <code className="font-mono text-[11px] text-lime break-all leading-relaxed">$ {data.one_line_install}</code>
          <button data-testid="copy-install-btn" onClick={() => copy("inst", data.one_line_install)} className="p-1 border border-white/10 hover:border-lime/50 rounded-sm flex-shrink-0 mt-0.5">
            {copied === "inst" ? <CheckCircle size={11} className="text-lime" /> : <Copy size={11} />}
          </button>
        </div>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white py-1">▸ systemd unit (recommended)</summary>
        <div className="border border-white/10 bg-black/70 rounded-sm mt-1">
          <div className="flex items-start justify-between gap-2 px-3 py-2">
            <pre className="font-mono text-[10px] text-white/80 whitespace-pre-wrap leading-snug flex-1">{data.systemd_unit}</pre>
            <button data-testid="copy-systemd-btn" onClick={() => copy("sys", data.systemd_unit)} className="p-1 border border-white/10 hover:border-lime/50 rounded-sm flex-shrink-0 mt-0.5">
              {copied === "sys" ? <CheckCircle size={11} className="text-lime" /> : <Copy size={11} />}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
