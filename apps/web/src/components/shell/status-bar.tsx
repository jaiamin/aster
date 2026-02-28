import { useModuleToggle, useModuleCounts, useModuleFilter } from "@/modules/module-context";
import { TIME_PRESETS, type TimePreset } from "@/lib/time-filter";
import type { MapStatus } from "@/types/map";

const PRESET_LABELS: Record<TimePreset, string> = {
  "1h": "1h",
  "6h": "6h",
  "24h": "24h",
  "3d": "3d",
  "7d": "7d",
  "30d": "30d",
  all: "All",
};

export function BottomBar({ status }: { status: MapStatus }) {
  const { viewState, altitude } = status;
  const { enabledModules } = useModuleToggle();
  const { moduleCounts } = useModuleCounts();
  const { timeFilter, setTimeFilter } = useModuleFilter();

  const layerCount = enabledModules.size;
  let totalItems = 0;
  for (const [id, count] of moduleCounts) {
    if (enabledModules.has(id) && typeof count === "number") totalItems += count;
  }

  return (
    <div className="flex h-8 w-full items-center border-t border-panel-border bg-panel px-3 text-[10px]">
      {/* Left: coordinates */}
      <div className="flex flex-1 items-center gap-3 font-mono tabular-nums tracking-wider text-muted">
        <span>
          {viewState.latitude >= 0 ? "N" : "S"} {Math.abs(viewState.latitude).toFixed(4)}°
        </span>
        <span className="text-panel-border">·</span>
        <span>
          {viewState.longitude >= 0 ? "E" : "W"} {Math.abs(viewState.longitude).toFixed(4)}°
        </span>
        <span className="text-panel-border">·</span>
        <span>Z {viewState.zoom.toFixed(1)}</span>
        <span className="text-panel-border">·</span>
        <span>{altitude.toLocaleString()} km</span>
      </div>

      {/* Center: time filter pills */}
      <div className="mx-auto flex items-center gap-0.5">
        {TIME_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setTimeFilter(p)}
            className={`rounded px-2 py-0.5 font-medium transition-colors ${
              p === timeFilter
                ? "bg-accent text-white"
                : "text-muted hover:bg-panel-hover hover:text-foreground"
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Right: layer summary */}
      <div className="flex flex-1 items-center justify-end gap-1.5 font-mono tabular-nums tracking-wider text-muted">
        <span>
          {layerCount} {layerCount === 1 ? "layer" : "layers"}
        </span>
        <span className="text-panel-border">·</span>
        <span>{totalItems.toLocaleString()} items</span>
      </div>
    </div>
  );
}
