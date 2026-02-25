import type { MapStatus } from "@/types/map";

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] tracking-widest text-muted">{label}</span>
      <span className="text-xs text-accent tabular-nums">{value}</span>
    </div>
  );
}

export function HudOverlay({ status }: { status: MapStatus }) {
  const { viewState } = status;

  return (
    <div className="scanline absolute left-3 top-3 z-10 border border-panel-border bg-panel px-3 py-2 backdrop-blur-md">
      <div className="flex flex-col gap-1">
        <Readout
          label="LAT"
          value={viewState.latitude.toFixed(4) + "°"}
        />
        <Readout
          label="LNG"
          value={viewState.longitude.toFixed(4) + "°"}
        />
        <Readout
          label="BRG"
          value={
            ((viewState.bearing % 360) + 360).toFixed(1).padStart(5, "0") + "°"
          }
        />
        <Readout
          label="PIT"
          value={viewState.pitch.toFixed(1) + "°"}
        />
      </div>
    </div>
  );
}
