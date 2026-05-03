import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Cpu, Lightning, CurrencyDollar, Clock } from "@phosphor-icons/react";
import { api, fmtUsd, fmtNum, fmtPct, fmtDays } from "../lib/api";
import ElectricitySlider from "../components/ElectricitySlider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const Stat = ({ label, value, accent, testid }) => (
  <div className="bg-white border-r border-b border-slate-200 p-5 flex flex-col gap-2" data-testid={testid}>
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
    <span className={`text-2xl font-bold font-mono ${accent || "text-slate-900"}`}>{value}</span>
  </div>
);

export default function RigDetail() {
  const { id } = useParams();
  const [rig, setRig] = useState(null);
  const [electricity, setElectricity] = useState(0.10);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    api
      .get(`/rigs/${id}`, { params: { electricity } })
      .then((r) => setRig(r.data))
      .catch((e) => setError(e?.response?.status === 404 ? "Rig not found" : "Failed to load"));
  }, [id, electricity]);

  if (error)
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center" data-testid="rig-error">
        <h1 className="text-3xl font-bold text-slate-900">{error}</h1>
        <Link
          to="/rigs"
          className="mt-6 inline-flex items-center gap-2 text-emerald-700 font-bold uppercase text-xs tracking-wider"
        >
          <ArrowLeft size={14} weight="bold" /> Back to rigs
        </Link>
      </div>
    );
  if (!rig)
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center font-mono text-slate-500">
        Loading…
      </div>
    );

  const chartData = [
    { label: "Revenue", value: rig.revenue_usd_day, color: "#10B981" },
    { label: "Power Cost", value: rig.power_cost_usd_day, color: "#F59E0B" },
    { label: "Profit", value: Math.max(rig.profit_usd_day, 0), color: "#0F172A" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="rig-detail-page">
      <Link
        to="/rigs"
        data-testid="back-to-rigs"
        className="text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 mb-6"
      >
        <ArrowLeft size={12} weight="bold" /> All Rigs
      </Link>

      <div className="grid lg:grid-cols-12 gap-8 mb-10">
        <div className="lg:col-span-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
            {rig.type} · {rig.manufacturer} · {rig.algo.toUpperCase()}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900">
            {rig.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase">
              Mines {rig.coin_symbol}
            </span>
            {rig.is_profitable ? (
              <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold tracking-[0.2em] uppercase">
                Profitable
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 text-[10px] font-bold tracking-[0.2em] uppercase">
                Not Profitable
              </span>
            )}
            <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold tracking-[0.2em] uppercase">
              Released {rig.release_year}
            </span>
          </div>
        </div>
        <div className="lg:col-span-4">
          <ElectricitySlider value={electricity} onChange={setElectricity} testid="rig-electricity" />
        </div>
      </div>

      {/* Stats grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-200 mb-10">
        <Stat
          label="Profit / Day"
          value={fmtUsd(rig.profit_usd_day)}
          accent={rig.profit_usd_day > 0 ? "text-emerald-600" : "text-red-600"}
          testid="stat-profit-day"
        />
        <Stat label="Profit / Month" value={fmtUsd(rig.profit_usd_month)} testid="stat-profit-month" />
        <Stat label="Profit / Year" value={fmtUsd(rig.profit_usd_year)} testid="stat-profit-year" />
        <Stat
          label="Annual ROI"
          value={rig.roi_year_pct ? fmtPct(rig.roi_year_pct, 1) : "—"}
          accent="text-emerald-600"
          testid="stat-roi"
        />
        <Stat label="Hashrate" value={`${fmtNum(rig.hashrate, rig.hashrate < 10 ? 2 : 0)} ${rig.unit}`} testid="stat-hashrate" />
        <Stat label="Power Draw" value={`${fmtNum(rig.power_w, 0)} W`} testid="stat-power" />
        <Stat label="Hardware Price" value={fmtUsd(rig.price_usd, 0)} testid="stat-price" />
        <Stat label="Payback" value={fmtDays(rig.payback_days)} testid="stat-payback" />
      </section>

      <section className="grid lg:grid-cols-12 gap-8 mb-10">
        <div className="lg:col-span-7 bg-white border border-slate-200 p-6">
          <h3 className="text-xl font-bold tracking-tight mb-1">Daily P&L breakdown</h3>
          <div className="text-xs text-slate-500 mb-6 font-mono">
            Revenue minus power cost @ {fmtUsd(electricity, 3)}/kWh
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }} />
              <YAxis tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }} />
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.04)" }}
                contentStyle={{
                  borderRadius: 0,
                  border: "1px solid #0F172A",
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                }}
                formatter={(v) => fmtUsd(v)}
              />
              <Bar dataKey="value">
                {chartData.map((d) => (
                  <Cell key={d.label} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6">
          <h3 className="text-xl font-bold tracking-tight mb-4">Coin output / day</h3>
          <ul className="divide-y divide-slate-200">
            {rig.revenue_breakdown?.map((b) => (
              <li
                key={b.cg_id}
                className="py-4 flex items-center justify-between"
                data-testid={`coin-output-${b.symbol}`}
              >
                <div>
                  <div className="font-bold text-sm">{b.symbol}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    @ {fmtUsd(b.price, b.price < 1 ? 5 : 2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-sm">
                    {fmtNum(b.coins_per_day, b.coins_per_day < 1 ? 6 : 4)} {b.symbol}
                  </div>
                  <div className="font-mono text-emerald-600 text-xs">
                    {fmtUsd(b.usd_per_day)}/day
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lightning size={10} weight="bold" /> Energy
              </div>
              <div className="text-slate-900 font-semibold">
                {fmtNum(rig.power_kwh_day, 1)} kWh/day
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Cpu size={10} weight="bold" /> Efficiency
              </div>
              <div className="text-slate-900 font-semibold">
                {rig.efficiency_j_per_unit
                  ? `${fmtNum(rig.efficiency_j_per_unit, 2)} W/${rig.unit.split("/")[0]}`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CurrencyDollar size={10} weight="bold" /> Daily power
              </div>
              <div className="text-slate-900 font-semibold">{fmtUsd(rig.power_cost_usd_day)}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={10} weight="bold" /> Payback
              </div>
              <div className="text-slate-900 font-semibold">{fmtDays(rig.payback_days)}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
