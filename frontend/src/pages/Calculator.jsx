import { useEffect, useState } from "react";
import { Calculator as CalcIcon, ArrowRight } from "@phosphor-icons/react";
import { api, fmtUsd, fmtPct, fmtDays } from "../lib/api";
import ElectricitySlider from "../components/ElectricitySlider";

export default function Calculator() {
  const [coins, setCoins] = useState([]);
  const [coinId, setCoinId] = useState("bitcoin");
  const [hashrate, setHashrate] = useState(200);
  const [powerW, setPowerW] = useState(3500);
  const [rigPrice, setRigPrice] = useState(3290);
  const [electricity, setElectricity] = useState(0.10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/coins").then((r) => setCoins(r.data));
  }, []);

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/calculate", {
        coin_id: coinId,
        hashrate,
        power_w: powerW,
        rig_price_usd: rigPrice,
        electricity_usd_kwh: electricity,
      });
      setResult(r.data);
    } finally {
      setLoading(false);
    }
  };

  // Auto-recalc on change
  useEffect(() => {
    if (!coinId) return;
    const t = setTimeout(submit, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [coinId, hashrate, powerW, rigPrice, electricity]);

  const selectedCoin = coins.find((c) => c.cg_id === coinId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="calculator-page">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2">
        <CalcIcon size={12} weight="bold" /> Custom Profit Calculator
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 mb-8">
        Roll your own numbers.
      </h1>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <form onSubmit={submit} className="lg:col-span-5 space-y-5" data-testid="calculator-form">
          <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Coin
            </label>
            <select
              value={coinId}
              onChange={(e) => setCoinId(e.target.value)}
              data-testid="calc-coin"
              className="w-full bg-white border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
            >
              {coins.map((c) => (
                <option key={c.cg_id} value={c.cg_id}>
                  {c.name} ({c.symbol}) — {c.algo}
                </option>
              ))}
            </select>
            {selectedCoin && (
              <div className="text-xs font-mono text-slate-500">
                Network: {Number(selectedCoin.network_hashrate).toLocaleString()} {selectedCoin.unit} · Price:{" "}
                {fmtUsd(selectedCoin.price_usd, selectedCoin.price_usd < 1 ? 4 : 2)}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Your Hashrate ({selectedCoin?.unit || "—"})
            </label>
            <input
              type="number"
              value={hashrate}
              min={0}
              step="any"
              onChange={(e) => setHashrate(Number(e.target.value))}
              data-testid="calc-hashrate"
              className="w-full bg-white border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Power Draw (W)
            </label>
            <input
              type="number"
              value={powerW}
              min={0}
              step="any"
              onChange={(e) => setPowerW(Number(e.target.value))}
              data-testid="calc-power"
              className="w-full bg-white border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Hardware Price (USD)
            </label>
            <input
              type="number"
              value={rigPrice}
              min={0}
              step="any"
              onChange={(e) => setRigPrice(Number(e.target.value))}
              data-testid="calc-price"
              className="w-full bg-white border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
            />
          </div>

          <ElectricitySlider value={electricity} onChange={setElectricity} testid="calc-electricity" />

          <button
            type="submit"
            data-testid="calc-submit"
            className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors px-6 py-4 font-bold text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2"
          >
            Recalculate <ArrowRight size={14} weight="bold" />
          </button>
        </form>

        {/* Result */}
        <div className="lg:col-span-7" data-testid="calc-result">
          {!result ? (
            <div className="border border-slate-200 bg-slate-50 p-12 text-center font-mono text-sm text-slate-500">
              {loading ? "Calculating…" : "Adjust inputs to see your projected profit."}
            </div>
          ) : (
            <>
              <div
                className={`p-8 border ${
                  result.is_profitable
                    ? "bg-emerald-600 text-white border-emerald-700"
                    : "bg-red-50 text-red-900 border-red-300"
                }`}
                data-testid="calc-headline"
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80 mb-3">
                  {result.is_profitable ? "Net profit" : "You'd lose money"} · {result.coin_symbol}
                </div>
                <div className="text-5xl sm:text-6xl font-black tracking-tighter font-mono">
                  {fmtUsd(result.profit_usd_day)}
                  <span className="text-base font-normal opacity-70">/day</span>
                </div>
                <div className="text-sm opacity-90 mt-3 font-mono">
                  {fmtUsd(result.profit_usd_month)}/mo · {fmtUsd(result.profit_usd_year)}/yr
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-200 mt-6">
                <Cell label="Revenue/day" value={fmtUsd(result.revenue_usd_day)} />
                <Cell label="Power cost/day" value={fmtUsd(result.power_cost_usd_day)} />
                <Cell label="Annual ROI" value={result.roi_year_pct ? fmtPct(result.roi_year_pct, 1) : "—"} accent="text-emerald-600" />
                <Cell label="Payback" value={fmtDays(result.payback_days)} />
              </div>

              {result.revenue_breakdown?.length > 1 && (
                <div className="mt-6 bg-white border border-slate-200 p-6">
                  <h3 className="text-base font-bold mb-4">Coin output</h3>
                  <ul className="divide-y divide-slate-200">
                    {result.revenue_breakdown.map((b) => (
                      <li key={b.cg_id} className="py-3 flex items-center justify-between">
                        <span className="font-bold text-sm">{b.symbol}</span>
                        <span className="font-mono text-sm">
                          {b.coins_per_day.toFixed(b.coins_per_day < 1 ? 6 : 4)} {b.symbol} ·{" "}
                          <span className="text-emerald-600">{fmtUsd(b.usd_per_day)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const Cell = ({ label, value, accent }) => (
  <div className="bg-white border-r border-b border-slate-200 p-5 flex flex-col gap-2">
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
    <span className={`text-xl font-bold font-mono ${accent || "text-slate-900"}`}>{value}</span>
  </div>
);
