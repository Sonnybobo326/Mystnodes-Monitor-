import React, { useState } from "react";
import { api } from "../lib/api";
import { X, Lightning, TrendUp, ArrowRight } from "@phosphor-icons/react";

const catColor = {
  RESTART: "text-[#FFB000] border-[#FFB000]/30 bg-[#FFB000]/5",
  RELOCATE: "text-[#00F0FF] border-[#00F0FF]/30 bg-[#00F0FF]/5",
  PRICING: "text-lime border-lime/30 bg-lime/5",
  HARDWARE: "text-white border-white/20 bg-white/5",
  NETWORK: "text-[#00F0FF] border-[#00F0FF]/30 bg-[#00F0FF]/5",
  SETTLEMENT: "text-lime border-lime/30 bg-lime/5",
};

export default function ProfitOptimizerModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.post("/ai/profit-optimizer");
      setData(r.data);
    } catch (e) {
      setError("Optimizer failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="profit-optimizer-modal">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface border border-lime/40 rounded-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm border border-lime/40 bg-lime/10 flex items-center justify-center">
              <Lightning size={16} weight="fill" className="text-lime" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">AI · Claude Sonnet 4.5</div>
              <div className="font-display text-xl font-semibold">Profit Optimizer</div>
            </div>
          </div>
          <button onClick={onClose} data-testid="close-profit-modal-btn" className="h-8 w-8 flex items-center justify-center border border-white/10 hover:border-lime/50 rounded-sm">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!data && !loading && (
            <div className="text-center py-8">
              <div className="font-body text-white/70 mb-5 max-w-md mx-auto leading-relaxed">
                Run a full-fleet analysis. PROFIT-OPS will rank 5–8 concrete actions by expected MYST uplift and effort.
              </div>
              <button
                data-testid="run-profit-optimizer-btn"
                onClick={run}
                className="bg-lime text-black hover:bg-[#b3e600] px-5 py-2.5 rounded-sm font-mono text-xs uppercase tracking-widest font-semibold"
              >
                ▶ Run Optimizer
              </button>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center">
              <div className="font-mono text-sm text-lime caret">Analyzing 12 nodes · 30d history · earnings anomalies</div>
            </div>
          )}

          {error && <div className="font-mono text-sm text-[#FF3366]">{error}</div>}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-white/10 bg-app/40 rounded-sm p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Current · est/mo</div>
                  <div className="font-mono text-2xl text-white mt-1">{(data.estimated_current_monthly_myst || 0).toFixed(1)}</div>
                  <div className="font-mono text-[10px] text-white/40">MYST</div>
                </div>
                <div className="border border-lime/30 bg-lime/5 rounded-sm p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-lime">Optimized · est/mo</div>
                  <div className="font-mono text-2xl text-lime mt-1">{(data.estimated_optimized_monthly_myst || 0).toFixed(1)}</div>
                  <div className="font-mono text-[10px] text-white/40">MYST</div>
                </div>
                <div className="border border-white/10 bg-app/40 rounded-sm p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-1">
                    <TrendUp size={14} className="text-lime" />
                    <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Uplift</div>
                  </div>
                  <div className="font-mono text-2xl text-lime mt-1">+{(data.uplift_pct || 0).toFixed(1)}%</div>
                </div>
              </div>

              {data.headline && (
                <div className="border-l-2 border-lime pl-4 font-body text-white/90 leading-relaxed italic">
                  {data.headline}
                </div>
              )}

              <div className="space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">// playbook</div>
                {(data.actions || []).map((a, i) => (
                  <div key={i} data-testid={`profit-action-${i}`} className="border border-white/10 bg-app/40 rounded-sm p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-mono text-[10px] w-6 h-6 flex items-center justify-center border border-lime/40 bg-lime/10 text-lime rounded-sm flex-shrink-0">
                          P{a.priority}
                        </span>
                        <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border rounded-sm ${catColor[a.category] || "text-white/70 border-white/10"}`}>
                          {a.category}
                        </span>
                        <span className="font-mono text-[11px] text-white/50">→</span>
                        <span className="font-mono text-[11px] text-white/90">{a.target_node}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-sm text-lime whitespace-nowrap">+{(a.expected_myst_delta_monthly || 0).toFixed(1)} MYST</div>
                        <div className="font-mono text-[9px] text-white/40 uppercase tracking-widest">effort {a.effort}</div>
                      </div>
                    </div>
                    <div className="font-display text-base font-medium text-white mt-1">{a.action}</div>
                    <div className="font-body text-sm text-white/70 mt-1 leading-relaxed">{a.rationale}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={run}
                  className="border border-white/10 hover:border-lime/50 px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-widest text-white/80 hover:text-white flex items-center gap-1"
                >
                  <ArrowRight size={12} /> Re-analyze
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
