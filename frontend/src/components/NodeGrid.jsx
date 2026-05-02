import React from "react";

const flagMap = {
  US: "🇺🇸", DE: "🇩🇪", JP: "🇯🇵", GB: "🇬🇧", NL: "🇳🇱",
  CA: "🇨🇦", SG: "🇸🇬", BR: "🇧🇷", FR: "🇫🇷", AU: "🇦🇺",
};

function StatusDot({ status }) {
  if (status === "online") {
    return (
      <span className="relative flex h-2.5 w-2.5" aria-label="online">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime" />
      </span>
    );
  }
  const color = status === "degraded" ? "bg-[#FFB000]" : "bg-[#FF3366]";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-label={status} />;
}

export default function NodeGrid({ nodes, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="node-grid">
      {nodes.map((n, idx) => (
        <button
          key={n.id}
          data-testid={`node-card-${n.name}`}
          onClick={() => onSelect(n.id)}
          className="text-left border border-white/10 bg-surface hover:bg-surfaceHover hover:border-lime/40 transition-all rounded-sm p-4 group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusDot status={n.status} />
              <span className="font-mono text-xs uppercase tracking-widest text-white/90">{n.name}</span>
            </div>
            <span className="font-mono text-[10px] text-white/40">v{n.version}</span>
          </div>

          <div className="flex items-center gap-2 mb-4 text-white/60 font-mono text-[11px]">
            <span>{flagMap[n.country_code] || "🏳"}</span>
            <span>{n.city}</span>
            <span className="text-white/20">·</span>
            <span>{n.country_code}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Earnings</div>
              <div className="font-mono text-base text-lime">{n.earnings_myst.toFixed(2)}</div>
              <div className="font-mono text-[10px] text-white/40">MYST</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Uptime</div>
              <div className={`font-mono text-base ${n.uptime_pct > 95 ? "text-white" : n.uptime_pct > 80 ? "text-[#FFB000]" : "text-[#FF3366]"}`}>
                {n.uptime_pct.toFixed(2)}%
              </div>
              <div className="font-mono text-[10px] text-white/40">30d</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Bandwidth</div>
              <div className="font-mono text-sm text-white/90">{n.bandwidth_gb.toFixed(1)} GB</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Sessions</div>
              <div className="font-mono text-sm text-white/90">{n.sessions.toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-white/40">
            <span>{n.ip}</span>
            <span className="group-hover:text-lime transition-colors">OPEN →</span>
          </div>
        </button>
      ))}
    </div>
  );
}
