import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { TrendDown, TrendUp } from "@phosphor-icons/react";

export default function PriceTicker() {
  const [p, setP] = useState(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await api.get("/price/myst");
        if (alive) setP(r.data);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!p) return null;
  const up = p.change_24h_pct >= 0;
  const Icon = up ? TrendUp : TrendDown;
  const color = up ? "text-lime" : "text-[#FF3366]";
  return (
    <div className="hidden md:flex items-center gap-2 border border-white/10 rounded-sm px-3 py-2 font-mono text-[11px]" data-testid="price-ticker">
      <span className="text-white/50 uppercase tracking-widest text-[10px]">MYST</span>
      <span className="text-white">${p.usd.toFixed(4)}</span>
      <span className={`flex items-center gap-0.5 ${color}`}>
        <Icon size={11} weight="bold" />
        {p.change_24h_pct >= 0 ? "+" : ""}{p.change_24h_pct.toFixed(2)}%
      </span>
    </div>
  );
}
