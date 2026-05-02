import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Wallet, Copy, CheckCircle, ArrowSquareOut, Warning, Clock } from "@phosphor-icons/react";

export default function WalletPanel() {
  const [settings, setSettings] = useState(null);
  const [withdrawals, setWithdrawals] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, w] = await Promise.all([
          api.get("/settings"),
          api.get("/withdrawals"),
        ]);
        setSettings(s.data);
        setWithdrawals(w.data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch {}
  };

  if (!settings) {
    return <div className="border border-white/10 bg-surface rounded-sm p-5 h-72 animate-pulse" />;
  }

  return (
    <div className="border border-cyan/30 bg-cyan/[0.03] rounded-sm p-5" data-testid="wallet-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={16} weight="fill" className="text-[#00F0FF]" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#00F0FF]">Wallet &amp; Auto-Withdrawal</div>
        </div>
        {settings.configured ? (
          <span className="font-mono text-[10px] uppercase tracking-widest text-lime flex items-center gap-1">
            <CheckCircle size={12} weight="fill" /> Configured
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFB000] flex items-center gap-1">
            <Warning size={12} weight="fill" /> Not configured
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="border border-white/10 bg-app/40 rounded-sm p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">Payout wallet (Polygon · MYST)</div>
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-white break-all" data-testid="wallet-address">{settings.wallet || "—"}</code>
            {settings.wallet && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  data-testid="copy-wallet-btn"
                  onClick={() => copy("wallet", settings.wallet)}
                  className="p-1.5 border border-white/10 hover:border-cyan/50 rounded-sm"
                  title="Copy"
                >
                  {copied === "wallet" ? <CheckCircle size={12} className="text-lime" /> : <Copy size={12} />}
                </button>
                <a
                  data-testid="polygonscan-link"
                  href={settings.polygon_scan_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 border border-white/10 hover:border-cyan/50 rounded-sm flex items-center"
                  title="Open on Polygonscan"
                >
                  <ArrowSquareOut size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-white/10 bg-app/40 rounded-sm p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Threshold</div>
            <div className="font-mono text-base text-white mt-1">{settings.threshold_myst} MYST</div>
          </div>
          <div className="border border-white/10 bg-app/40 rounded-sm p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">API Key</div>
            <div className="font-mono text-base text-white mt-1">{settings.api_key_masked || "—"}</div>
          </div>
        </div>

        {settings.commands.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-2">
              Run on each node to enable auto-withdrawal:
            </div>
            <div className="space-y-2">
              {settings.commands.map((c, i) => (
                <div key={i} className="border border-white/10 bg-black/60 rounded-sm">
                  <div className="px-3 pt-2 font-body text-[11px] text-white/50 leading-tight">{c.label}</div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <code className="font-mono text-[11px] text-lime break-all">$ {c.cmd}</code>
                    <button
                      data-testid={`copy-cmd-${i}`}
                      onClick={() => copy(`cmd-${i}`, c.cmd)}
                      className="p-1 border border-white/10 hover:border-lime/50 rounded-sm flex-shrink-0"
                      title="Copy"
                    >
                      {copied === `cmd-${i}` ? <CheckCircle size={11} className="text-lime" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {withdrawals && withdrawals.withdrawals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Recent auto-settlements</div>
              <div className="font-mono text-[10px] text-white/30">pending: {withdrawals.pending_myst} MYST</div>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {withdrawals.withdrawals.slice().reverse().map((w) => (
                <div key={w.tx_hash_preview} className="flex items-center justify-between border border-white/5 bg-app/40 rounded-sm px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={12} className="text-white/40 flex-shrink-0" />
                    <div className="font-mono text-[11px] text-white/60 truncate">{w.date}</div>
                  </div>
                  <div className="font-mono text-[11px] text-lime whitespace-nowrap">+{w.amount_myst} MYST</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="font-body text-[11px] text-white/50 leading-relaxed pt-2 border-t border-white/5">
          {settings.notes[0]} Live on-chain history is on{" "}
          <a href={settings.polygon_scan_url} target="_blank" rel="noreferrer" className="text-cyan underline underline-offset-2">Polygonscan</a>.
        </div>
      </div>
    </div>
  );
}
