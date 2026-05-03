import { Lightning } from "@phosphor-icons/react";
import { fmtUsd } from "../lib/api";

export const ElectricitySlider = ({ value, onChange, testid = "electricity-slider" }) => (
  <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
        <Lightning size={12} weight="bold" /> Electricity Rate
      </span>
      <span className="font-mono font-bold text-emerald-600 text-base">
        {fmtUsd(value, 3)}/kWh
      </span>
    </div>
    <input
      type="range"
      min={0}
      max={0.4}
      step={0.005}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      data-testid={testid}
      className="w-full h-2 bg-slate-200 appearance-none cursor-pointer accent-slate-900"
      style={{ borderRadius: 0 }}
    />
    <div className="flex justify-between text-[10px] font-mono text-slate-400">
      <span>$0.00</span>
      <span>$0.10 (avg)</span>
      <span>$0.40</span>
    </div>
  </div>
);

export default ElectricitySlider;
