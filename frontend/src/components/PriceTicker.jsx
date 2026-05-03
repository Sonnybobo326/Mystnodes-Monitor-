import { ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { fmtUsd, fmtPct } from "../lib/api";

export const PriceTicker = ({ coins }) => {
  if (!coins?.length) return null;
  const items = [...coins, ...coins]; // duplicate for seamless marquee
  return (
    <div
      className="bg-slate-900 text-white border-b border-slate-200 overflow-hidden"
      data-testid="price-ticker"
    >
      <div className="marquee-track py-2.5">
        {items.map((c, i) => {
          const up = c.change_24h >= 0;
          return (
            <div
              key={`${c.cg_id}-${i}`}
              className="flex items-center gap-3 px-6 border-r border-white/10 whitespace-nowrap"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">
                {c.symbol}
              </span>
              <span className="font-mono font-semibold text-sm">
                {fmtUsd(c.price_usd, c.price_usd < 1 ? 4 : 2)}
              </span>
              <span
                className={`font-mono text-xs flex items-center gap-1 ${
                  up ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {up ? <ArrowUp size={11} weight="bold" /> : <ArrowDown size={11} weight="bold" />}
                {fmtPct(c.change_24h)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriceTicker;
