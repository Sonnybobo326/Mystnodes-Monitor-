import { CurrencyBtc, TrendUp, ChartLineUp, Cpu, Lightning } from "@phosphor-icons/react";
import { fmtUsd, fmtPct, fmtNum } from "../lib/api";

const Cell = ({ label, value, sub, icon, accent, testid }) => (
  <div
    className="bg-white border-r border-b border-slate-200 p-6 flex flex-col gap-3 hover-shadow"
    data-testid={testid}
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <div className="text-slate-300">{icon}</div>
    </div>
    <div
      className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight ${
        accent || "text-slate-900"
      }`}
    >
      {value}
    </div>
    {sub && <div className="text-xs font-mono text-slate-500">{sub}</div>}
  </div>
);

export const KpiStrip = ({ stats }) => {
  if (!stats) return null;
  const btcUp = (stats.btc_change_24h ?? 0) >= 0;
  return (
    <section
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-200"
      data-testid="kpi-strip"
    >
      <Cell
        label="BTC Price"
        value={fmtUsd(stats.btc_price, 0)}
        sub={
          <span className={btcUp ? "text-emerald-600" : "text-red-600"}>
            {fmtPct(stats.btc_change_24h)} 24H
          </span>
        }
        icon={<CurrencyBtc size={20} weight="bold" />}
        testid="kpi-btc"
      />
      <Cell
        label="Top Rig / Day"
        value={fmtUsd(stats.top_rig_profit_day)}
        sub={stats.top_rig_name || "—"}
        icon={<TrendUp size={20} weight="bold" />}
        accent="text-emerald-600"
        testid="kpi-top-rig"
      />
      <Cell
        label="Best Annual ROI"
        value={`${fmtNum(stats.best_roi_year_pct, 1)}%`}
        sub={`Coin: ${stats.best_coin_by_roi || "—"}`}
        icon={<ChartLineUp size={20} weight="bold" />}
        accent="text-emerald-600"
        testid="kpi-roi"
      />
      <Cell
        label="Profitable Rigs"
        value={`${stats.profitable_rigs}/${stats.total_rigs}`}
        sub={
          <span className="flex items-center gap-2">
            <Lightning size={12} weight="bold" /> @ {fmtUsd(stats.electricity, 3)}/kWh
          </span>
        }
        icon={<Cpu size={20} weight="bold" />}
        testid="kpi-profitable"
      />
    </section>
  );
};

export default KpiStrip;
