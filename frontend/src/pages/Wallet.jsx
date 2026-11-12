import { useEffect, useMemo, useState } from "react";
import { ArrowClockwise, ArrowUpRight, Coins, GlobeHemisphereWest, Wallet as WalletIcon } from "@phosphor-icons/react";
import { api, fmtNum, fmtUsd } from "../lib/api";

const SETTINGS_KEY = "sonnymoney-wallet-settings-v1";
const CHAINS = [
  { id: "bsc", name: "BNB Smart Chain" },
  { id: "eth", name: "Ethereum" },
  { id: "opbnb", name: "opBNB" },
  { id: "arbitrum", name: "Arbitrum One" },
  { id: "base", name: "Base" },
];

function loadSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      dailyMyst: saved.dailyMyst ?? "",
      unpaidMyst: saved.unpaidMyst ?? "",
      payoutThreshold: saved.payoutThreshold ?? "",
    };
  } catch {
    return { dailyMyst: "", unpaidMyst: "", payoutThreshold: "" };
  }
}

function Metric({ label, value, detail, dark = false }) {
  return (
    <div className={`min-w-0 border p-5 sm:p-6 ${dark ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${dark ? "text-white/60" : "text-slate-500"}`}>{label}</div>
      <div className={`mt-3 break-words font-mono text-2xl font-bold tracking-tight sm:text-3xl ${dark ? "text-emerald-400" : "text-slate-900"}`}>{value}</div>
      {detail && <div className={`mt-2 text-xs leading-relaxed ${dark ? "text-white/60" : "text-slate-500"}`}>{detail}</div>}
    </div>
  );
}

export default function Wallet() {
  const [chain, setChain] = useState("bsc");
  const [address, setAddress] = useState("");
  const [wallet, setWallet] = useState(null);
  const [mystPrice, setMystPrice] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/mystnodes")
      .then(({ data }) => {
        if (active) setMystPrice(Number(data.myst_price_usd) || 0);
      })
      .catch(() => {
        if (active) setPriceError("Live MYST price is temporarily unavailable.");
      })
      .finally(() => {
        if (active) setPriceLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // The dashboard still works when browser storage is disabled.
    }
  }, [settings]);

  const dailyMyst = Math.max(0, Number(settings.dailyMyst) || 0);
  const unpaidMyst = Math.max(0, Number(settings.unpaidMyst) || 0);
  const threshold = Math.max(0, Number(settings.payoutThreshold) || 0);
  const estimatedDayUsd = mystPrice === null ? null : dailyMyst * mystPrice;
  const estimatedMonthUsd = estimatedDayUsd === null ? null : estimatedDayUsd * 30;
  const unpaidUsd = mystPrice === null ? null : unpaidMyst * mystPrice;
  const progress = threshold > 0 ? Math.min(100, (unpaidMyst / threshold) * 100) : 0;
  const payoutReady = threshold > 0 && unpaidMyst >= threshold;
  const chainName = useMemo(() => CHAINS.find((item) => item.id === chain)?.name || chain, [chain]);

  const updateSetting = (key) => (event) => {
    const value = event.target.value;
    if (value === "" || (Number(value) >= 0 && Number.isFinite(Number(value)))) {
      setSettings((current) => ({ ...current, [key]: value }));
    }
  };

  const lookupWallet = async (event) => {
    event.preventDefault();
    setError("");
    setWallet(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      setError("Enter a valid 0x-prefixed EVM wallet address (42 characters). No private key is needed.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/wallet/${chain}/${encodeURIComponent(address.trim())}`);
      setWallet(data);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not load this wallet. Check the address and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50" data-testid="wallet-page">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-700">
            <WalletIcon size={15} weight="bold" /> SonnyMoney · Wallet & rewards
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tighter text-slate-900 sm:text-5xl">Your money, in one place.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Check an on-chain wallet balance and track your MYST node rewards. Your wallet address is only used for a read-only balance lookup.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <section className="border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="wallet-lookup-title">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-50 text-emerald-700"><WalletIcon size={20} /></div>
            <div>
              <h2 id="wallet-lookup-title" className="text-lg font-bold">Wallet balance</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Read-only native token balance on a supported EVM network. Never enter a seed phrase or private key.</p>
            </div>
          </div>
          <form onSubmit={lookupWallet} className="grid gap-3 sm:grid-cols-[minmax(150px,0.7fr)_minmax(0,2fr)_auto]">
            <label className="text-xs font-bold text-slate-700">
              Network
              <select value={chain} onChange={(event) => setChain(event.target.value)} className="mt-2 min-h-12 w-full rounded-none border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                {CHAINS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Public wallet address
              <input value={address} onChange={(event) => setAddress(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck="false" inputMode="text" placeholder="0x…" className="mt-2 min-h-12 w-full rounded-none border border-slate-300 px-3 font-mono text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <button type="submit" disabled={loading} className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60">
              {loading ? <ArrowClockwise className="animate-spin" size={17} /> : <ArrowUpRight size={17} />}
              {loading ? "Checking…" : "Check balance"}
            </button>
          </form>
          {error && <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {wallet && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-live="polite">
              <Metric label={`${wallet.symbol} balance · ${chainName}`} value={`${fmtNum(wallet.balance, 6)} ${wallet.symbol}`} detail={`As of block ${wallet.as_of_block?.toLocaleString?.() || "—"}`} dark />
              <Metric label="Transactions sent" value={fmtNum(wallet.tx_count, 0)} detail="On-chain transaction count for this address." />
              <div className="flex min-w-0 flex-col justify-between border border-slate-200 bg-white p-5 sm:p-6">
                <div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Network explorer</div><p className="mt-2 break-all text-xs text-slate-600">{wallet.address}</p></div>
                <a href={wallet.explorer_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 border border-slate-300 px-3 text-xs font-bold text-slate-800 hover:border-slate-900">Open explorer <ArrowUpRight size={14} /></a>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="earnings-title">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-emerald-100 text-emerald-800"><Coins size={20} /></div>
            <div><h2 id="earnings-title" className="text-xl font-bold tracking-tight">Node earnings & payouts</h2><p className="mt-1 text-xs text-slate-500">Your entries stay in this browser; MYST rewards are estimates, not provider-reported payouts.</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="MYST price" value={priceLoading ? "Loading…" : mystPrice === null ? "Unavailable" : fmtUsd(mystPrice, 4)} detail={priceError || "Live market price from the app price feed."} />
            <Metric label="Estimated daily rewards" value={estimatedDayUsd === null ? "—" : fmtUsd(estimatedDayUsd, 2)} detail={`${fmtNum(dailyMyst, 4)} MYST/day · set your actual recent average below.`} />
            <Metric label="Estimated 30-day rewards" value={estimatedMonthUsd === null ? "—" : fmtUsd(estimatedMonthUsd, 2)} detail={`${fmtNum(dailyMyst * 30, 4)} MYST at today's price; token value can change.`} />
            <Metric label="Unpaid rewards estimate" value={unpaidUsd === null ? "—" : fmtUsd(unpaidUsd, 2)} detail={`${fmtNum(unpaidMyst, 4)} MYST entered by you.`} dark />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border border-slate-200 bg-white p-5 sm:p-6">
              <h3 className="font-bold">Track your rewards</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Enter figures from your node provider dashboard. This app does not connect to your Mystnodes account or fetch its payout history.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-bold text-slate-700">Average MYST earned / day<input type="number" min="0" step="any" inputMode="decimal" value={settings.dailyMyst} onChange={updateSetting("dailyMyst")} placeholder="e.g. 0.25" className="mt-2 min-h-12 w-full rounded-none border border-slate-300 px-3 font-mono text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                <label className="text-xs font-bold text-slate-700">Unpaid MYST balance<input type="number" min="0" step="any" inputMode="decimal" value={settings.unpaidMyst} onChange={updateSetting("unpaidMyst")} placeholder="e.g. 2.5" className="mt-2 min-h-12 w-full rounded-none border border-slate-300 px-3 font-mono text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                <label className="text-xs font-bold text-slate-700">Payout threshold · MYST<input type="number" min="0" step="any" inputMode="decimal" value={settings.payoutThreshold} onChange={updateSetting("payoutThreshold")} placeholder="Optional" className="mt-2 min-h-12 w-full rounded-none border border-slate-300 px-3 font-mono text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><GlobeHemisphereWest size={15} className="mt-0.5 shrink-0" /> Values are saved on this device only. No earnings or payout transaction is initiated from this dashboard.</p>
            </div>

            <div className="border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-bold">Payout progress</h3><p className="mt-1 text-xs text-slate-500">Based on your manually entered rewards and threshold.</p></div>
                <span className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${payoutReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {threshold <= 0 ? "Set threshold" : payoutReady ? "Threshold reached" : "Accumulating"}
                </span>
              </div>
              <div className="mt-6 flex items-end justify-between gap-3 font-mono"><span className="text-2xl font-bold">{fmtNum(unpaidMyst, 4)} <span className="text-sm">MYST</span></span><span className="text-xs text-slate-500">{threshold > 0 ? `${fmtNum(threshold, 4)} MYST target` : "No target set"}</span></div>
              <div className="mt-3 h-2 overflow-hidden bg-slate-100" role="progressbar" aria-label="Payout threshold progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className={`h-full transition-all ${payoutReady ? "bg-emerald-600" : "bg-slate-800"}`} style={{ width: `${progress}%` }} /></div>
              <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{threshold > 0 ? `${progress.toFixed(0)}% of target` : "Enter a threshold to track progress"}</span><span>{unpaidUsd === null ? "—" : fmtUsd(unpaidUsd, 2)}</span></div>
              {threshold > 0 && dailyMyst > 0 && !payoutReady && <p className="mt-4 text-xs text-slate-500">At your entered average, approximately {Math.ceil((threshold - unpaidMyst) / dailyMyst)} days to threshold. This is a projection, not a payout date.</p>}
              {payoutReady && <p className="mt-4 border-l-2 border-emerald-600 pl-3 text-xs leading-relaxed text-slate-600">Your entered balance meets the threshold. Confirm payout availability and timing with your node provider.</p>}
            </div>
          </div>
        </section>

        <aside className="border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          <strong>Important:</strong> This dashboard does not custody funds, connect to a payout provider, or send cryptocurrency. Wallet lookups are public, read-only blockchain queries. Never share a seed phrase or private key.
        </aside>
      </div>
    </main>
  );
}
