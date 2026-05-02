import React from "react";
import { Bell, WarningCircle, Info, XCircle } from "@phosphor-icons/react";

function sevIcon(sev) {
  if (sev === "critical") return <XCircle size={14} className="text-[#FF3366]" weight="fill" />;
  if (sev === "warning") return <WarningCircle size={14} className="text-[#FFB000]" weight="fill" />;
  return <Info size={14} className="text-[#00F0FF]" weight="fill" />;
}

function relTime(iso) {
  const d = new Date(iso);
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AlertsFeed({ alerts }) {
  return (
    <div className="border border-white/10 bg-surface rounded-sm p-5" data-testid="alerts-feed">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-white/60" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">Event Feed</div>
        </div>
        <div className="font-mono text-[10px] text-white/30">{alerts.length} events</div>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start gap-2 p-2 border border-white/5 bg-app/40 rounded-sm">
            <div className="mt-0.5">{sevIcon(a.severity)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-body text-xs text-white/80 leading-snug">{a.message}</div>
              <div className="font-mono text-[10px] text-white/30 mt-0.5">{relTime(a.timestamp)}</div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="font-mono text-xs text-white/40">No events yet.</div>
        )}
      </div>
    </div>
  );
}
