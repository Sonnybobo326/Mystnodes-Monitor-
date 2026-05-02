import React, { useState } from "react";
import { api } from "../lib/api";
import { Sparkle, WarningCircle, Info, XCircle, ArrowClockwise } from "@phosphor-icons/react";

function sevIcon(sev) {
  if (sev === "critical") return <XCircle size={16} className="text-[#FF3366]" weight="fill" />;
  if (sev === "warning") return <WarningCircle size={16} className="text-[#FFB000]" weight="fill" />;
  return <Info size={16} className="text-lime" weight="fill" />;
}

export default function AIInsights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.post("/ai/insights");
      setInsights(r.data.insights || []);
    } catch (e) {
      setError("AI insights unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-lime/30 bg-lime/[0.03] rounded-sm p-5 shimmer-border" data-testid="ai-insights-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkle size={16} weight="fill" className="text-lime" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-lime">AI Insights</div>
        </div>
        <button
          data-testid="run-ai-insights-btn"
          onClick={run}
          disabled={loading}
          className="border border-white/10 hover:border-lime/50 px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase tracking-widest text-white/80 hover:text-white disabled:opacity-50 flex items-center gap-1.5"
        >
          <ArrowClockwise size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Analyzing" : insights.length ? "Re-run" : "Analyze"}
        </button>
      </div>

      {error && <div className="font-mono text-xs text-[#FF3366]">{error}</div>}

      {!loading && insights.length === 0 && !error && (
        <div className="font-mono text-xs text-white/50 leading-relaxed">
          Click <span className="text-lime">Analyze</span> to let NODE-OPS scan your fleet for anomalies, underperformers and optimization opportunities.
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-white/[0.03] border border-white/5 animate-pulse rounded-sm" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {insights.map((ins, idx) => (
          <div key={idx} className="flex gap-3 p-3 border border-white/5 bg-app/40 rounded-sm" data-testid={`insight-${idx}`}>
            <div className="mt-0.5">{sevIcon(ins.severity)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-medium text-white">{ins.title}</div>
              <div className="font-body text-xs text-white/60 mt-0.5 leading-relaxed">{ins.detail}</div>
              {ins.node && <div className="font-mono text-[10px] text-lime mt-1">→ {ins.node}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
