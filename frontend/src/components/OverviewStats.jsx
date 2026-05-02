import React from "react";
import { CurrencyEth, CloudArrowUp, Broadcast, Gauge, CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";

function Stat({ label, value, sub, icon: Icon, accent = "lime", testid }) {
  const accentClass = accent === "lime" ? "text-lime" : accent === "cyan" ? "text-[#00F0FF]" : "text-white";
  return (
    <div
      data-testid={testid}
      className="group relative border border-white/10 bg-surface hover:bg-surfaceHover transition-colors rounded-sm p-5 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</div>
        {Icon && <Icon size={18} className={accentClass} />}
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`font-mono text-3xl md:text-4xl font-semibold ${accentClass}`}>{value}</div>
        {sub && <div className="font-mono text-[11px] text-white/40">{sub}</div>}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function OverviewStats({ data, loading }) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 border border-white/10 bg-surface rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      <Stat
        testid="stat-earnings"
        label="Total Earnings"
        value={`${data.total_earnings_myst.toFixed(2)}`}
        sub={`MYST · ~$${data.total_earnings_usd.toFixed(2)}`}
        icon={CurrencyEth}
      />
      <Stat
        testid="stat-nodes"
        label="Active Nodes"
        value={`${data.active}/${data.total_nodes}`}
        sub={`${data.degraded} deg · ${data.offline} off`}
        icon={Broadcast}
        accent="cyan"
      />
      <Stat
        testid="stat-bandwidth"
        label="Bandwidth Served"
        value={`${data.total_bandwidth_gb.toFixed(0)}`}
        sub={`GB · ${data.total_sessions.toLocaleString()} sessions`}
        icon={CloudArrowUp}
      />
      <Stat
        testid="stat-uptime"
        label="Avg Uptime"
        value={`${data.avg_uptime_pct.toFixed(2)}%`}
        sub={`quality ${data.avg_quality_score.toFixed(2)}/10`}
        icon={Gauge}
        accent="cyan"
      />
    </div>
  );
}
