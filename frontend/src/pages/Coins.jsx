import { useEffect, useState } from "react";
import { api, fmtUsd, fmtPct, fmtCompact, fmtNum } from "../lib/api";

export default function Coins() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/coins").then((r) => setCoins(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="coins-page">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
        Mining Coins
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 mb-8">
        Coins you can mine for profit.
      </h1>

      {loading ? (
        <div className="border border-slate-200 p-12 text-center font-mono text-sm text-slate-500">
          Loading…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-slate-200">
          {coins.map((c) => {
            const up = (c.change_24h ?? 0) >= 0;
            return (
              <div
                key={c.cg_id}
                className="bg-white border-r border-b border-slate-200 p-6 flex flex-col gap-4 hover-shadow"
                data-testid={`coin-card-${c.symbol}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      {c.algo}
                    </div>
                    <div className="text-2xl font-bold tracking-tight mt-1">{c.name}</div>
                    <div className="text-xs font-mono text-slate-500">{c.symbol}</div>
                  </div>
                  <span
                    className={`px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${
                      up ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {fmtPct(c.change_24h)}
                  </span>
                </div>

                <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                  {fmtUsd(c.price_usd, c.price_usd < 1 ? 5 : 2)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-3 border-t border-slate-200">
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Market Cap</div>
                    <div className="text-slate-900 font-semibold">${fmtCompact(c.market_cap)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Volume 24h</div>
                    <div className="text-slate-900 font-semibold">${fmtCompact(c.volume_24h)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Network HR</div>
                    <div className="text-slate-900 font-semibold">
                      {fmtCompact(c.network_hashrate)} {c.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Block Reward</div>
                    <div className="text-slate-900 font-semibold">
                      {fmtNum(c.block_reward, 3)} {c.symbol}
                    </div>
                  </div>
                </div>

                {c.merge_rewards?.length > 0 && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5">
                    + Merge mined: {c.merge_rewards.map((m) => m.symbol).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
