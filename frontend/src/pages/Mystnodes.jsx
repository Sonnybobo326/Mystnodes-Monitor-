import { useEffect, useState } from "react";
import {
  ArrowSquareOut,
  GlobeHemisphereWest,
  Lightning,
  Cube,
  TrendUp,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { api, fmtUsd, fmtPct, fmtNum, fmtDays } from "../lib/api";
import ElectricitySlider from "../components/ElectricitySlider";

export default function Mystnodes() {
  const [data, setData] = useState(null);
  const [electricity, setElectricity] = useState(0.10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/mystnodes", { params: { electricity } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [electricity]);

  return (
    <div className="bg-white" data-testid="mystnodes-page">
      {/* Hero */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8 fade-up">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-700 mb-3 flex items-center gap-2">
              <GlobeHemisphereWest size={12} weight="fill" /> Passive Income · No Hashrate Needed
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 leading-[0.95]">
              Mystnodes.
              <br />
              <span className="text-emerald-600">Earn while you sleep.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Run a Mysterium node on hardware you already own. Share unused bandwidth, earn{" "}
              <span className="font-mono font-semibold text-slate-900">MYST</span> tokens
              continuously. No GPU, no ASIC, no noise. Pairs perfectly with mining rigs to
              compound passive income.
            </p>

            {data && (
              <a
                href={data.referral_url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="mystnodes-cta-primary"
                className="mt-8 inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors px-7 py-4 font-bold text-sm uppercase tracking-wider"
              >
                Start earning on Mystnodes <ArrowSquareOut size={14} weight="bold" />
              </a>
            )}
            {data?.referral_code && (
              <div className="mt-3 text-xs font-mono text-slate-500">
                Referral code: <span className="text-slate-900 font-semibold">{data.referral_code}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-slate-900 text-white p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-2">
                MYST Token (live)
              </div>
              <div className="text-4xl font-bold font-mono text-emerald-400">
                {fmtUsd(data?.myst_price_usd ?? 0, 4)}
              </div>
              <div
                className={`mt-1 text-sm font-mono ${
                  (data?.myst_change_24h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {fmtPct(data?.myst_change_24h ?? 0)} · 24h
              </div>
            </div>
            <ElectricitySlider value={electricity} onChange={setElectricity} testid="mystnodes-electricity" />
          </div>
        </div>
      </section>

      {/* Profiles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
          Hardware profiles
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-6">
          Pick your setup, see real numbers.
        </h2>

        {loading || !data ? (
          <div className="border border-slate-200 p-12 text-center font-mono text-sm text-slate-500">
            Loading…
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-200">
            {data.profiles.map((p) => (
              <div
                key={p.id}
                className="bg-white border-r border-b border-slate-200 p-6 flex flex-col gap-4 hover-shadow"
                data-testid={`mystnode-profile-${p.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      <Cube size={10} weight="bold" className="inline mr-1" />
                      {p.power_w}W
                    </div>
                    <div className="text-lg font-bold tracking-tight mt-1">{p.name}</div>
                  </div>
                  {p.is_profitable ? (
                    <CheckCircle size={20} weight="fill" className="text-emerald-600" />
                  ) : (
                    <XCircle size={20} weight="fill" className="text-red-500" />
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>

                <div
                  className={`p-4 ${
                    p.is_profitable ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Net profit / day
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono mt-1 ${
                      p.is_profitable ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {fmtUsd(p.profit_usd_day, 4)}
                  </div>
                  <div className="text-xs font-mono text-slate-600 mt-1">
                    {fmtUsd(p.profit_usd_month, 2)}/mo · {fmtUsd(p.profit_usd_year, 0)}/yr
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">MYST/day</div>
                    <div className="text-slate-900 font-semibold">{fmtNum(p.myst_per_day, 2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Hardware</div>
                    <div className="text-slate-900 font-semibold">{fmtUsd(p.hardware_cost_usd, 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Power cost</div>
                    <div className="text-slate-900 font-semibold">{fmtUsd(p.power_cost_usd_day, 4)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Payback</div>
                    <div className="text-slate-900 font-semibold">{fmtDays(p.payback_days)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Why */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid sm:grid-cols-3 gap-8">
          {[
            { icon: Lightning, label: "Ultra-low power", body: "7–35W typical. Most setups pay for their electricity in days." },
            { icon: GlobeHemisphereWest, label: "Bandwidth, not hash", body: "Earnings scale with quality of your IP and uptime, not GPU price." },
            { icon: TrendUp, label: "Stack with mining", body: "Run alongside an ASIC or GPU rig. Compounds your $/kWh story." },
          ].map((b, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6">
              <b.icon size={24} weight="bold" className="text-emerald-600" />
              <div className="text-base font-bold tracking-tight mt-4">{b.label}</div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      {data && (
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">
              Hardware sitting idle? Make it pay.
            </h2>
            <a
              href={data.referral_url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="mystnodes-cta-bottom"
              className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-colors px-8 py-4 font-bold text-sm uppercase tracking-wider"
            >
              Sign up with referral <ArrowSquareOut size={14} weight="bold" />
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
