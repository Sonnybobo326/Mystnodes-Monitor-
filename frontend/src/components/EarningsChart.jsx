import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function TipBox({ active, payload, label, suffix = "" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="border border-lime/40 bg-app/90 backdrop-blur px-3 py-2 rounded-sm font-mono text-xs">
      <div className="text-white/50 text-[10px] uppercase tracking-widest">{label}</div>
      <div className="text-lime">{payload[0].value.toLocaleString()}{suffix}</div>
    </div>
  );
}

export default function EarningsChart({ history }) {
  return (
    <div className="border border-white/10 bg-surface rounded-sm p-5" data-testid="earnings-chart">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">// signal</div>
          <h3 className="font-display text-xl font-semibold">Earnings · 30 days</h3>
        </div>
        <div className="font-mono text-[11px] text-white/40">MYST</div>
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ccff00" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#ccff00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={(d) => d.slice(5)} />
            <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <Tooltip content={<TipBox suffix=" MYST" />} cursor={{ stroke: "#ccff00", strokeOpacity: 0.2 }} />
            <Area type="monotone" dataKey="earnings_myst" stroke="#ccff00" strokeWidth={2} fill="url(#earn)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
