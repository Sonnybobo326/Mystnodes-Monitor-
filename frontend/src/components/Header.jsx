import React from "react";
import { ArrowsClockwise, Robot, Pulse, Lightning } from "@phosphor-icons/react";
import PriceTicker from "./PriceTicker";

export default function Header({ onRefresh, onOpenChat, onOpenProfit, refreshing }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-app/70 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 rounded-sm border border-lime/40 bg-lime/10 flex items-center justify-center">
            <Pulse size={18} weight="bold" className="text-lime" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-lime animate-ping" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-lime" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base md:text-lg font-semibold tracking-tight">
              Mystnodes <span className="text-lime">Monitor</span>
            </div>
            <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
              decentralized fleet control · live
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PriceTicker />
          <button
            data-testid="refresh-dashboard-btn"
            onClick={onRefresh}
            disabled={refreshing}
            className="group flex items-center gap-2 border border-white/10 hover:border-lime/50 transition-colors px-3 py-2 rounded-sm font-mono text-[11px] uppercase tracking-widest text-white/80 hover:text-white disabled:opacity-50"
          >
            <ArrowsClockwise size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Syncing" : "Refresh"}
          </button>
          <button
            data-testid="open-profit-optimizer-btn"
            onClick={onOpenProfit}
            className="hidden sm:flex items-center gap-2 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors px-3 py-2 rounded-sm font-mono text-[11px] uppercase tracking-widest"
          >
            <Lightning size={14} weight="fill" />
            Optimize Profit
          </button>
          <button
            data-testid="open-ai-chat-btn"
            onClick={onOpenChat}
            className="flex items-center gap-2 bg-lime text-black hover:bg-[#b3e600] transition-colors px-3 py-2 rounded-sm font-mono text-[11px] uppercase tracking-widest font-semibold"
          >
            <Robot size={14} weight="bold" />
            AI Copilot
          </button>
        </div>
      </div>
    </header>
  );
}
