import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function TipBox({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="border border-[#00F0FF]/40 bg-app/90 backdrop-blur px-3 py-2 rounded-sm font-mono text-xs">
      <div className="text-white/50 text-[10px] uppercase tracking-widest">{label}</div>
      <div className="text-[#00F0FF]">{payload[0].value.toLocaleString()} GB</div>
    </div>
  );
}

export default function BandwidthChart({ history }) {
  return (
    <div className="border border-white/10 bg-surface rounded-sm p-5" data-testid="bandwidth-chart">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">// throughput</div>
          <h3 className="font-display text-xl font-semibold">Bandwidth · 30 days</h3>
        </div>
        <div className="font-mono text-[11px] text-white/40">GB</div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={(d) => d.slice(5)} />
            <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <Tooltip content={<TipBox />} cursor={{ fill: "rgba(0,240,255,0.05)" }} />
            <Bar dataKey="bandwidth_gb" fill="#00F0FF" fillOpacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
