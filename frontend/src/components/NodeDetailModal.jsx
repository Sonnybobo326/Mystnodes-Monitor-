import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { X, MapPin, Cpu, Clock, Hash } from "@phosphor-icons/react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function NodeDetailModal({ nodeId, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/nodes/${nodeId}`);
        setData(r.data);
      } catch (e) { console.error(e); }
    })();
  }, [nodeId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="node-detail-modal">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface border border-white/10 rounded-sm">
        {!data ? (
          <div className="p-10 font-mono text-xs text-white/50">Loading…</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${data.node.status === "online" ? "bg-lime" : data.node.status === "degraded" ? "bg-[#FFB000]" : "bg-[#FF3366]"}`} />
                <div>
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Node</div>
                  <div className="font-display text-xl font-semibold">{data.node.name}</div>
                </div>
              </div>
              <button onClick={onClose} data-testid="close-node-detail-btn" className="h-8 w-8 flex items-center justify-center border border-white/10 hover:border-lime/50 rounded-sm">
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Info label="Earnings" value={`${data.node.earnings_myst.toFixed(2)} MYST`} accent="lime" />
                <Info label="Uptime" value={`${data.node.uptime_pct.toFixed(2)}%`} />
                <Info label="Bandwidth" value={`${data.node.bandwidth_gb.toFixed(1)} GB`} />
                <Info label="Sessions" value={data.node.sessions.toLocaleString()} />
                <Info label="Quality" value={`${data.node.quality_score.toFixed(1)}/10`} accent="cyan" />
                <Info label="Location" value={`${data.node.city}, ${data.node.country_code}`} />
                <Info label="Version" value={`v${data.node.version}`} />
                <Info label="IP" value={data.node.ip} />
              </div>

              <div className="border border-white/10 bg-app/40 rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2 text-white/50">
                  <Hash size={12} />
                  <span className="font-mono text-[10px] uppercase tracking-widest">Identity</span>
                </div>
                <div className="font-mono text-xs text-white/80 break-all">{data.node.identity}</div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">// 30-day earnings</div>
                  <div className="font-mono text-[10px] text-white/30">MYST/day</div>
                </div>
                <div className="h-48 border border-white/10 bg-app/40 rounded-sm p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.history} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                      <Tooltip
                        contentStyle={{ background: "#0A0B0E", border: "1px solid rgba(204,255,0,0.4)", borderRadius: 3, fontFamily: "JetBrains Mono", fontSize: 11 }}
                        labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                      />
                      <Line type="monotone" dataKey="earnings_myst" stroke="#ccff00" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, accent }) {
  const color = accent === "lime" ? "text-lime" : accent === "cyan" ? "text-[#00F0FF]" : "text-white";
  return (
    <div className="border border-white/10 bg-app/40 rounded-sm p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={`font-mono text-sm mt-1 ${color}`}>{value}</div>
    </div>
  );
}
