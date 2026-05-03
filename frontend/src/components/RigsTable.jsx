import { Link } from "react-router-dom";
import { ArrowRight, Cpu, GraphicsCard, Memory } from "@phosphor-icons/react";
import { fmtUsd, fmtNum, fmtDays, fmtPct } from "../lib/api";

const TypeIcon = ({ t }) =>
  t === "GPU" ? (
    <GraphicsCard size={14} weight="bold" />
  ) : t === "CPU" ? (
    <Cpu size={14} weight="bold" />
  ) : (
    <Memory size={14} weight="bold" />
  );

export const RigsTable = ({ rigs, compact = false }) => {
  if (!rigs?.length) {
    return (
      <div
        className="border border-slate-200 bg-slate-50 p-12 text-center"
        data-testid="rigs-empty"
      >
        <div className="text-sm font-bold uppercase tracking-wider text-slate-700">
          No profitable rigs at this electricity rate
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Lower the electricity slider to see rigs that flip into profit.
        </div>
      </div>
    );
  }
  return (
    <div className="border border-slate-200 bg-white overflow-x-auto" data-testid="rigs-table">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {[
              "#",
              "Rig",
              "Coin",
              "Hashrate",
              "Power",
              "Profit / Day",
              "ROI / Yr",
              "Payback",
              "Price",
              "",
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rigs.map((r, i) => (
            <tr
              key={r.id}
              className="border-b border-slate-200 hover:bg-emerald-50/40 transition-colors"
              data-testid={`rig-row-${r.id}`}
            >
              <td className="px-4 py-3 font-mono text-xs text-slate-400 w-10">
                {String(i + 1).padStart(2, "0")}
              </td>
              <td className="px-4 py-3">
                <div className="font-bold text-sm text-slate-900">{r.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5 flex items-center gap-1">
                  <TypeIcon t={r.type} /> {r.type} · {r.manufacturer}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-sm">
                <span className="px-2 py-1 bg-slate-900 text-white text-[10px] font-bold tracking-wider">
                  {r.coin_symbol}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">
                {fmtNum(r.hashrate, r.hashrate < 10 ? 2 : 0)}
                <span className="text-slate-500 ml-1">{r.unit}</span>
              </td>
              <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">
                {fmtNum(r.power_w, 0)}
                <span className="text-slate-500 ml-1">W</span>
              </td>
              <td className="px-4 py-3 font-mono text-sm font-bold text-emerald-600 whitespace-nowrap">
                {fmtUsd(r.profit_usd_day)}
              </td>
              <td className="px-4 py-3 font-mono text-sm">
                <span
                  className={
                    r.roi_year_pct && r.roi_year_pct > 100
                      ? "text-emerald-600 font-semibold"
                      : "text-slate-700"
                  }
                >
                  {r.roi_year_pct ? fmtPct(r.roi_year_pct, 0) : "—"}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-slate-700">
                {fmtDays(r.payback_days)}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-slate-700 whitespace-nowrap">
                {fmtUsd(r.price_usd, 0)}
              </td>
              <td className="px-4 py-3">
                <Link
                  to={`/rig/${r.id}`}
                  data-testid={`rig-detail-${r.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-900 hover:text-emerald-600"
                >
                  View <ArrowRight size={12} weight="bold" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RigsTable;
