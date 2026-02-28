import type { FilterValue } from "@/modules/explorer-context";
import type { FilterField } from "@/types/modules";

export function RangeFilter({
  field,
  value,
  onChange,
  isActive: _isActive,
  onClear: _onClear,
}: {
  field: Extract<FilterField, { type: "range" }>;
  value: FilterValue | undefined;
  onChange: (val: FilterValue) => void;
  isActive: boolean;
  onClear: () => void;
}) {
  const min = value?.type === "range" ? value.min : field.min;
  const max = value?.type === "range" ? value.max : field.max;
  const unit = field.unit ?? "";
  const step = field.max - field.min <= 10 ? 0.1 : 1;
  const range = field.max - field.min;
  const minPct = ((min - field.min) / range) * 100;
  const maxPct = ((max - field.min) / range) * 100;
  const midPct = (minPct + maxPct) / 2;

  return (
    <div>
      <label className="text-[11px] font-semibold text-white">{field.label}</label>
      <div className="relative mt-2 h-4">
        <div className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full bg-panel-border" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-accent"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={step}
          value={min}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ type: "range", min: Math.min(v, max), max });
          }}
          className="range-thumb absolute inset-0 w-full cursor-ew-resize appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.3)] [&::-webkit-slider-thumb]:cursor-ew-resize"
          style={{ zIndex: 3, clipPath: `inset(0 ${100 - midPct}% 0 0)` }}
        />
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={step}
          value={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ type: "range", min, max: Math.max(v, min) });
          }}
          className="range-thumb absolute inset-0 w-full cursor-ew-resize appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.3)] [&::-webkit-slider-thumb]:cursor-ew-resize"
          style={{ zIndex: 4, clipPath: `inset(0 0 0 ${midPct}%)` }}
        />
      </div>
      <div className="relative mt-0.5 h-4">
        <span
          className="absolute text-[10px] tabular-nums text-white/50"
          style={{ left: `${minPct}%`, transform: `translateX(-${minPct}%)` }}
        >
          {min}
          {unit}
        </span>
        <span
          className="absolute text-[10px] tabular-nums text-white/50"
          style={{ left: `${maxPct}%`, transform: `translateX(-${maxPct}%)` }}
        >
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
