import { useEffect, useState } from "react";
import { api } from "../lib/api";
import RigsTable from "../components/RigsTable";
import ElectricitySlider from "../components/ElectricitySlider";

const ALGOS = [
  { v: null, label: "All" },
  { v: "sha256", label: "SHA-256" },
  { v: "scrypt", label: "Scrypt" },
  { v: "kheavyhash", label: "kHeavyHash" },
  { v: "kawpow", label: "KAWPOW" },
  { v: "etchash", label: "Etchash" },
  { v: "equihash", label: "Equihash" },
  { v: "x11", label: "X11" },
  { v: "randomx", label: "RandomX" },
  { v: "blake3", label: "Blake3" },
];

const SORTS = [
  { v: "profit", label: "Daily profit" },
  { v: "roi", label: "Annual ROI" },
  { v: "payback", label: "Payback time" },
  { v: "price", label: "Hardware price" },
];

export default function Rigs() {
  const [rigs, setRigs] = useState([]);
  const [electricity, setElectricity] = useState(0.10);
  const [profitableOnly, setProfitableOnly] = useState(true);
  const [algo, setAlgo] = useState(null);
  const [sort, setSort] = useState("profit");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/rigs", { params: { electricity, profitable_only: profitableOnly, algo, sort } })
      .then((r) => setRigs(r.data))
      .finally(() => setLoading(false));
  }, [electricity, profitableOnly, algo, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="rigs-page">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
        Catalog
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 mb-8">
        All mining rigs
      </h1>

      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1">
          <ElectricitySlider value={electricity} onChange={setElectricity} testid="rigs-electricity" />
        </div>
        <div className="lg:col-span-3 grid sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Algorithm
            </span>
            <select
              value={algo || ""}
              onChange={(e) => setAlgo(e.target.value || null)}
              data-testid="algo-filter"
              className="w-full bg-white border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
            >
              {ALGOS.map((a) => (
                <option key={a.label} value={a.v || ""}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Sort by
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              data-testid="sort-filter"
              className="w-full bg-white border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
            >
              {SORTS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Filter
            </span>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profitableOnly}
                onChange={(e) => setProfitableOnly(e.target.checked)}
                data-testid="profitable-only-toggle"
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="text-sm font-mono text-slate-700">Profitable only</span>
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="border border-slate-200 p-12 text-center text-sm font-mono text-slate-500">
          Loading…
        </div>
      ) : (
        <>
          <div className="text-xs font-mono text-slate-500 mb-3">
            {rigs.length} rig{rigs.length === 1 ? "" : "s"} shown
          </div>
          <RigsTable rigs={rigs} />
        </>
      )}
    </div>
  );
}
