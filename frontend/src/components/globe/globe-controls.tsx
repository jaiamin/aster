import { useCallback, useState } from "react";
import { Plus, Minus, Map, Satellite, LocateFixed } from "lucide-react";
import type { MapViewState } from "@/types/map";
import type { MapStyleMode } from "@/config/map";
import { MIN_ZOOM } from "@/config/map";

interface GlobeControlsProps {
  viewState: MapViewState;
  onMove: (evt: { viewState: MapViewState }) => void;
  styleMode: MapStyleMode;
  onStyleChange: (mode: MapStyleMode) => void;
  onLocate: (coords: { lng: number; lat: number }) => void;
  hasLocation: boolean;
  map: maplibregl.Map | null;
}

function ControlButton({
  onClick,
  children,
  label,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center border transition-all ${
        active
          ? "border-panel-border bg-panel-hover text-accent"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const LOCATE_ZOOM = 12;

export function GlobeControls({
  viewState,
  onMove,
  styleMode,
  onStyleChange,
  onLocate,
  hasLocation,
  map,
}: GlobeControlsProps) {
  const [locating, setLocating] = useState(false);

  const update = useCallback(
    (partial: Partial<MapViewState>) => {
      onMove({ viewState: { ...viewState, ...partial } });
    },
    [viewState, onMove]
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        if (map) {
          map.once("moveend", () => onLocate(loc));
          map.flyTo({
            center: [loc.lng, loc.lat],
            zoom: LOCATE_ZOOM,
            duration: 2000,
          });
        } else {
          onLocate(loc);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [map, onLocate]);

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Locate */}
      <button
        onClick={locate}
        aria-label="Go to my location"
        className={`flex h-8 w-8 items-center justify-center border border-panel-border bg-panel transition-all hover:bg-panel-hover hover:text-foreground ${
          locating ? "text-accent animate-pulse" : hasLocation ? "text-accent" : "text-muted"
        }`}
      >
        <LocateFixed size={14} />
      </button>

      {/* Zoom */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => update({ zoom: Math.min(viewState.zoom + 1, 22) })}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center border border-panel-border bg-panel text-muted transition-all hover:bg-panel-hover hover:text-foreground"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => update({ zoom: Math.max(viewState.zoom - 1, MIN_ZOOM) })}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center border border-panel-border bg-panel text-muted transition-all hover:bg-panel-hover hover:text-foreground"
        >
          <Minus size={14} />
        </button>
      </div>

      {/* Style toggle */}
      <div className="flex gap-1 border border-panel-border bg-panel p-0.5">
        <ControlButton
          label="Map view"
          active={styleMode === "dark"}
          onClick={() => onStyleChange("dark")}
        >
          <Map size={14} />
        </ControlButton>
        <ControlButton
          label="Satellite view"
          active={styleMode === "satellite"}
          onClick={() => onStyleChange("satellite")}
        >
          <Satellite size={14} />
        </ControlButton>
      </div>
    </div>
  );
}
