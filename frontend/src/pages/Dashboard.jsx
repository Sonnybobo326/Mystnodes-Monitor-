import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkle, ChartBar, Wallet } from "@phosphor-icons/react";
import { api, fmtUsd, fmtPct, fmtCompact } from "../lib/api";
import KpiStrip from "../components/KpiStrip";
import RigsTable from "../components/RigsTable";
import ElectricitySlider from "../components/ElectricitySlider";

export default function Dashboard() {
  const [coins, setCoins] = useState([]);
  const [rigs, setRigs] = useState([]);
  const [stats, setStats] = useState(null);
  const [electricity, setElectricity] = useState(0.10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/coins").then((r) => setCoins(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/rigs", { params: { electricity, profitable_only: true, sort: "profit" } }),
      api.get("/stats", { params: { electricity } }),
    ])
      .then(([rigsRes, statsRes]) => {
        setRigs(rigsRes.data);
        setStats(statsRes.data);
      })
      .finally(() => setLoading(false));
  }, [electricity]);

  return (
    <div className="bg-white" data-testid="dashboard-page">
      {/* Hero */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8 fade-up">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-700 mb-4 flex items-center gap-2">
              <Sparkle size={12} weight="fill" /> Live Profitability · Updated every 60s
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 leading-[0.95]">
              Mining rigs that
              <br />
              actually <span className="text-emerald-600">make money.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Real-time profitability across SHA-256, Scrypt, kHeavyHash, KAWPOW and more.
              Unprofitable rigs are filtered out — what you see flips a profit at your
              electricity rate. No decoration.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/rigs"
                data-testid="hero-cta-rigs"
                className="bg-slate-900 text-white hover:bg-slate-800 transition-colors px-6 py-3 font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2"
              >
                Browse profitable rigs <ArrowRight size={14} weight="bold" />
              </Link>
              <Link
                to="/calculator"
                data-testid="hero-cta-calc"
                className="bg-white text-slate-900 border border-slate-300 hover:border-slate-900 transition-colors px-6 py-3 font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2"
              >
                Custom calculator
              </Link>
            </div>
          </div>
          <div className="lg:col-span-4">
            <ElectricitySlider value={electricity} onChange={setElectricity} testid="hero-electricity" />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <KpiStrip stats={stats} />
      </section>

      {/* Top profitable rigs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10" data-testid="top-rigs-section">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2">
              <ChartBar size={12} weight="bold" /> 01 — Leaderboard
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Top profitable rigs right now
            </h2>
          </div>
          <Link
            to="/rigs"
            className="text-xs font-bold uppercase tracking-wider text-slate-900 hover:text-emerald-600 inline-flex items-center gap-1"
            data-testid="view-all-rigs"
          >
            View all <ArrowRight size={12} weight="bold" />
          </Link>
        </div>
        {loading ? (
          <div className="border border-slate-200 p-12 text-center text-sm font-mono text-slate-500">
            Loading…
          </div>
        ) : (
          <RigsTable rigs={rigs.slice(0, 8)} />
        )}
      </section>

      {/* Coin market */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10" data-testid="coins-section">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2">
              <Wallet size={12} weight="bold" /> 02 — Mining Coins
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Live prices & network parameters
            </h2>
          </div>
          <Link
            to="/coins"
            className="text-xs font-bold uppercase tracking-wider text-slate-900 hover:text-emerald-600 inline-flex items-center gap-1"
            data-testid="view-all-coins"
          >
            All coins <ArrowRight size={12} weight="bold" />
          </Link>
        </div>
        <div className="border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {[
                  "Coin",
                  "Algo",
                  "Price",
                  "24H",
                  "Market Cap",
                  "Network HR",
                  "Block Reward",
                  "Blocks/Day",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coins.map((c) => {
                const up = (c.change_24h ?? 0) >= 0;
                return (
                  <tr
                    key={c.cg_id}
                    className="border-b border-slate-200 hover:bg-slate-50"
                    data-testid={`coin-row-${c.symbol}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-sm">{c.name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        {c.symbol}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {c.algo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold">
                      {fmtUsd(c.price_usd, c.price_usd < 1 ? 4 : 2)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono text-sm ${
                        up ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {fmtPct(c.change_24h)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">
                      ${fmtCompact(c.market_cap)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700 whitespace-nowrap">
                      {fmtCompact(c.network_hashrate)} {c.unit}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700 whitespace-nowrap">
                      {c.block_reward} {c.symbol}
                      {c.merge_rewards?.length > 0 && (
                        <span className="text-emerald-600">
                          {" + "}
                          {c.merge_rewards
                            .map((m) => `${m.per_block} ${m.symbol}`)
                            .join(" + ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">
                      {c.blocks_per_day}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer note */}
      <footer className="border-t border-slate-200 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid sm:grid-cols-3 gap-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
              Data Sources
            </div>
            <div className="text-sm text-slate-700 font-mono">
              CoinGecko Public API · NodeReal BSC RPC
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
              Updated
            </div>
            <div className="text-sm text-slate-700 font-mono">Every 60s · Cached</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
              Disclaimer
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              Profitability changes constantly with price, difficulty and electricity cost.
              Use these numbers as a starting point — not financial advice.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
