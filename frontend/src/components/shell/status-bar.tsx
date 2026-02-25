import type { MapStatus } from "@/types/map";

export function StatusBar({ status }: { status: MapStatus }) {
  const { viewState, altitude } = status;

  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-4 rounded border border-panel-border bg-panel px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted backdrop-blur-md">
      <span>
        {viewState.latitude >= 0 ? "N" : "S"}{" "}
        {Math.abs(viewState.latitude).toFixed(4)}°
      </span>
      <span>
        {viewState.longitude >= 0 ? "E" : "W"}{" "}
        {Math.abs(viewState.longitude).toFixed(4)}°
      </span>
      <span>Z {viewState.zoom.toFixed(1)}</span>
      <span>ALT {altitude.toLocaleString()} km</span>
    </div>
  );
}
