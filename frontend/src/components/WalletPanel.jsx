import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Wallet, Copy, CheckCircle, ArrowSquareOut, Warning, Clock, ArrowsClockwise } from "@phosphor-icons/react";

export default function WalletPanel() {
  const [settings, setSettings] = useState(null);
  const [onchain, setOnchain] = useState(null);
  const [copied, setCopied] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [s, w] = await Promise.all([api.get("/settings"), api.get("/onchain/withdrawals")]);
    setSettings(s.data);
    setOnchain(w.data);
  };
  useEffect(() => { load().catch(console.error); }, []);

  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1400); } catch {}
  };

  const refresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  if (!settings) return <div className="border border-white/10 bg-surface rounded-sm p-5 h-72 animate-pulse" />;

  const incoming = (onchain?.withdrawals || []).filter(w => w.direction === "in");

  return (
    <div className="border border-cyan/30 bg-cyan/[0.03] rounded-sm p-5" data-testid="wallet-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={16} weight="fill" className="text-[#00F0FF]" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#00F0FF]">Wallet &amp; Auto-Withdrawal</div>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="refresh-onchain-btn" onClick={refresh} className="p-1.5 border border-white/10 hover:border-cyan/50 rounded-sm" title="Refresh on-chain">
            <ArrowsClockwise size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
          {settings.configured ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-lime flex items-center gap-1"><CheckCircle size={12} weight="fill" /> Configured</span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFB000] flex items-center gap-1"><Warning size={12} weight="fill" /> Not configured</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="border border-white/10 bg-app/40 rounded-sm p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">Payout wallet (Polygon · MYST)</div>
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-white break-all" data-testid="wallet-address">{settings.wallet || "—"}</code>
            {settings.wallet && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button data-testid="copy-wallet-btn" onClick={() => copy("wallet", settings.wallet)} className="p-1.5 border border-white/10 hover:border-cyan/50 rounded-sm">
                  {copied === "wallet" ? <CheckCircle size={12} className="text-lime" /> : <Copy size={12} />}
                </button>
                <a data-testid="polygonscan-link" href={settings.polygon_scan_url} target="_blank" rel="noreferrer" className="p-1.5 border border-white/10 hover:border-cyan/50 rounded-sm flex items-center">
                  <ArrowSquareOut size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Real on-chain summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-white/10 bg-app/40 rounded-sm p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Received (on-chain)</div>
            <div className="font-mono text-base text-lime mt-1" data-testid="onchain-total-myst">{onchain?.total_myst_received?.toFixed(2) ?? "0.00"}</div>
            <div className="font-mono text-[10px] text-white/40">MYST</div>
          </div>
          <div className="border border-white/10 bg-app/40 rounded-sm p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">USD Value</div>
            <div className="font-mono text-base text-white mt-1" data-testid="onchain-total-usd">${onchain?.total_usd_received?.toFixed(2) ?? "0.00"}</div>
            <div className="font-mono text-[10px] text-white/40">@ ${onchain?.myst_price_usd?.toFixed(4) ?? "—"}</div>
          </div>
          <div className="border border-white/10 bg-app/40 rounded-sm p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Threshold</div>
            <div className="font-mono text-base text-white mt-1">{settings.threshold_myst}</div>
            <div className="font-mono text-[10px] text-white/40">MYST/settle</div>
          </div>
        </div>

        {settings.commands.length > 0 && (
          <details className="border border-white/10 bg-app/40 rounded-sm">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-white/60 px-3 py-2 hover:text-white">
              ▸ CLI commands (run on each node once)
            </summary>
            <div className="px-3 pb-3 space-y-2">
              {settings.commands.map((c, i) => (
                <div key={i} className="border border-white/10 bg-black/60 rounded-sm">
                  <div className="px-3 pt-2 font-body text-[11px] text-white/50 leading-tight">{c.label}</div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <code className="font-mono text-[11px] text-lime break-all">$ {c.cmd}</code>
                    <button data-testid={`copy-cmd-${i}`} onClick={() => copy(`cmd-${i}`, c.cmd)} className="p-1 border border-white/10 hover:border-lime/50 rounded-sm flex-shrink-0">
                      {copied === `cmd-${i}` ? <CheckCircle size={11} className="text-lime" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Real on-chain withdrawals list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">On-chain settlements · Polygon</div>
            <div className="font-mono text-[10px] text-white/30">{incoming.length} tx</div>
          </div>
          {incoming.length === 0 ? (
            <div className="border border-white/5 bg-app/40 rounded-sm p-3 font-body text-[11px] text-white/60 leading-relaxed" data-testid="onchain-empty">
              No incoming MYST to this wallet yet. Once you configure your nodes with the CLI commands above, settlements will appear here automatically (at ≥{settings.threshold_myst} MYST per node).
            </div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {incoming.slice(0, 12).map((w) => (
                <a
                  key={w.tx_hash}
                  href={`https://polygonscan.com/tx/${w.tx_hash}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-between border border-white/5 bg-app/40 hover:border-lime/40 rounded-sm px-3 py-2 group"
                  data-testid={`onchain-tx-${w.tx_hash.slice(0,10)}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={12} className="text-white/40 flex-shrink-0" />
                    <div className="font-mono text-[11px] text-white/70 truncate">{w.timestamp.slice(0, 16).replace("T", " ")}</div>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-mono text-[11px] text-lime">+{w.amount_myst.toFixed(3)} MYST</span>
                    <ArrowSquareOut size={10} className="text-white/30 group-hover:text-lime" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="font-body text-[11px] text-white/50 leading-relaxed pt-2 border-t border-white/5">
          Data from <span className="text-cyan">Blockscout</span> Polygon · refreshes every 60s ·{" "}
          <a href={settings.polygon_scan_url} target="_blank" rel="noreferrer" className="text-cyan underline underline-offset-2">view on Polygonscan</a>
        </div>
      </div>
    </div>
  );
}
