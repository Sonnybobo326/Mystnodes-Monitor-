import { useEffect, useState } from "react";
import {
  CircleNotch,
  Pulse,
  ArrowSquareOut,
  CheckCircle,
  XCircle,
  Cube,
  GasPump,
  MagnifyingGlass,
  Wallet,
} from "@phosphor-icons/react";
import { api, fmtNum } from "../lib/api";

const fmtGwei = (g) => {
  if (g === null || g === undefined) return "—";
  if (g < 0.001) return `${(g * 1e9).toFixed(0)} wei`;
  if (g < 1) return `${g.toFixed(4)} gwei`;
  return `${g.toFixed(2)} gwei`;
};

const NodeCard = ({ n }) => (
  <div
    className="bg-white border-r border-b border-slate-200 p-6 flex flex-col gap-4 hover-shadow"
    data-testid={`node-card-${n.id}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {n.symbol} · Chain ID {n.chain_id ?? "—"}
        </div>
        <div className="text-2xl font-bold tracking-tight mt-1">{n.name}</div>
      </div>
      {n.online ? (
        <span className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
          <CheckCircle size={11} weight="fill" /> Live
        </span>
      ) : (
        <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
          <XCircle size={11} weight="fill" /> Offline
        </span>
      )}
    </div>

    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
          <Cube size={11} weight="bold" /> Block height
        </div>
        <div className="font-mono font-bold text-slate-900 text-base">
          {n.block_number ? `#${n.block_number.toLocaleString()}` : "—"}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
          <GasPump size={11} weight="bold" /> Gas price
        </div>
        <div className="font-mono font-bold text-slate-900 text-base">{fmtGwei(n.gas_price_gwei)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
          <Pulse size={11} weight="bold" /> Block time
        </div>
        <div className="font-mono font-bold text-slate-900 text-base">{fmtNum(n.block_time_s, 2)}s</div>
      </div>
      <div>
        <a
          href={n.explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mt-4"
          data-testid={`node-explorer-${n.id}`}
        >
          Explorer <ArrowSquareOut size={11} weight="bold" />
        </a>
      </div>
    </div>
  </div>
);

const WalletLookup = () => {
  const [chain, setChain] = useState("bsc");
  const [address, setAddress] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault();
    setError(null);
    setData(null);
    if (!address.startsWith("0x") || address.length !== 42) {
      setError("Address must be a 0x-prefixed 42-char EVM address");
      return;
    }
    setLoading(true);
    try {
      const r = await api.get(`/wallet/${chain}/${address}`);
      setData(r.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-8 mt-10" data-testid="wallet-lookup">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400 mb-2 flex items-center gap-2">
        <Wallet size={12} weight="bold" /> Mining Payout Wallet Lookup
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
        Check any EVM mining wallet, live.
      </h2>
      <form onSubmit={lookup} className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          data-testid="wallet-chain"
          className="md:col-span-2 bg-white text-slate-900 border-0 px-3 py-3 font-mono text-sm focus:outline-none"
        >
          <option value="bsc">BSC</option>
          <option value="eth">ETH</option>
          <option value="opbnb">opBNB</option>
          <option value="arbitrum">ARB</option>
          <option value="base">Base</option>
        </select>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="0x… your mining payout wallet"
          data-testid="wallet-address"
          className="md:col-span-7 bg-white text-slate-900 border-0 px-4 py-3 font-mono text-sm focus:outline-none"
        />
        <button
          type="submit"
          data-testid="wallet-submit"
          disabled={loading}
          className="md:col-span-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider px-6 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <CircleNotch className="animate-spin" size={14} /> : <MagnifyingGlass size={14} weight="bold" />}
          {loading ? "Looking up" : "Look up"}
        </button>
      </form>
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-400 text-red-300 font-mono text-sm" data-testid="wallet-error">
          {error}
        </div>
      )}
      {data && (
        <div className="mt-6 grid sm:grid-cols-3 gap-px bg-white/10" data-testid="wallet-result">
          <div className="bg-slate-900 p-5">
            <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">Balance</div>
            <div className="text-3xl font-bold font-mono text-emerald-400">
              {fmtNum(data.balance, 6)} <span className="text-sm text-white/60">{data.symbol}</span>
            </div>
          </div>
          <div className="bg-slate-900 p-5">
            <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">Transactions</div>
            <div className="text-3xl font-bold font-mono">{data.tx_count.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 p-5">
            <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">As of block</div>
            <div className="text-3xl font-bold font-mono">#{data.as_of_block?.toLocaleString()}</div>
            <a
              href={data.explorer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 font-bold uppercase tracking-wider"
              data-testid="wallet-explorer-link"
            >
              View on explorer <ArrowSquareOut size={11} weight="bold" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Nodes() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get("/nodes")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="nodes-page">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2">
        <Pulse size={12} weight="bold" /> Powered by NodeReal RPC
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900">
        Live multi-chain status.
      </h1>
      <p className="mt-3 text-base text-slate-600 max-w-2xl">
        Real-time block heights and gas prices across the chains where mining payouts and rewards land.
        Refreshes every 15 seconds.
      </p>

      <div className="mt-4 flex items-center gap-3 text-xs font-mono text-slate-500">
        {data && (
          <span data-testid="nodes-online-count">
            <span className="text-emerald-600 font-bold">{data.online}</span> / {data.count} chains online
          </span>
        )}
        {!data?.configured && (
          <span className="text-red-600">NodeReal API key not configured</span>
        )}
      </div>

      {loading ? (
        <div className="mt-8 border border-slate-200 p-12 text-center font-mono text-sm text-slate-500">
          <CircleNotch size={20} className="animate-spin inline mr-2" /> Pinging chains…
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-slate-200">
          {data?.chains?.map((n) => (
            <NodeCard n={n} key={n.id} />
          ))}
        </div>
      )}

      <WalletLookup />
    </div>
  );
}
