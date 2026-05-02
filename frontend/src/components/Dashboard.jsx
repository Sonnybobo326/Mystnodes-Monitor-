import React, { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import Header from "./Header";
import OverviewStats from "./OverviewStats";
import NodeGrid from "./NodeGrid";
import EarningsChart from "./EarningsChart";
import BandwidthChart from "./BandwidthChart";
import AIInsights from "./AIInsights";
import AlertsFeed from "./AlertsFeed";
import AIChatDrawer from "./AIChatDrawer";
import NodeDetailModal from "./NodeDetailModal";
import WalletPanel from "./WalletPanel";
import ProfitOptimizerModal from "./ProfitOptimizerModal";
import BridgeInstallPanel from "./BridgeInstallPanel";

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profitOpen, setProfitOpen] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [o, n, h, a] = await Promise.all([
        api.get("/overview"),
        api.get("/nodes"),
        api.get("/history?days=30"),
        api.get("/alerts"),
      ]);
      setOverview(o.data);
      setNodes(n.data);
      setHistory(h.data);
      setAlerts(a.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post("/refresh");
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="App min-h-screen bg-app text-white bg-grid" data-testid="dashboard-root">
      <Header
        onRefresh={handleRefresh}
        onOpenChat={() => setChatOpen(true)}
        onOpenProfit={() => setProfitOpen(true)}
        refreshing={refreshing}
      />

      <main className="px-4 sm:px-6 md:px-8 lg:px-10 pb-24 max-w-[1600px] mx-auto">
        {/* Section: overview */}
        <div className="mt-6 anim-slide-up">
          <OverviewStats data={overview} loading={loading} />
        </div>

        {/* Section: AI insights + charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <EarningsChart history={history} />
            <BandwidthChart history={history} />
          </div>
          <div className="space-y-4 md:space-y-6">
            <AIInsights />
            <WalletPanel />
            <AlertsFeed alerts={alerts} />
          </div>
        </div>

        {/* Section: Nodes grid */}
        <div className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="font-mono text-xs text-white/40 tracking-widest uppercase">// fleet</div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">Active nodes</h2>
            </div>
            <div className="font-mono text-xs text-white/50">
              {nodes.length} total
            </div>
          </div>
          <NodeGrid nodes={nodes} onSelect={setSelectedNode} />
        </div>

        <div className="mt-10">
          <BridgeInstallPanel />
        </div>

        <footer className="mt-16 pt-6 border-t border-white/5 flex items-center justify-between font-mono text-[11px] text-white/30">
          <span>NODE-OPS v1.0.0 · MYSTNODES MONITOR</span>
          <span>{new Date().toISOString().slice(0,19).replace("T"," ")} UTC</span>
        </footer>
      </main>

      <AIChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
      {selectedNode && (
        <NodeDetailModal nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
      {profitOpen && <ProfitOptimizerModal onClose={() => setProfitOpen(false)} />}
    </div>
  );
}
