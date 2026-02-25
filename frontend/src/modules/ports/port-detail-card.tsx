import { Anchor, LocateFixed, X } from "lucide-react";
import { useMap } from "@vis.gl/react-maplibre";
import { usePortSelection } from "./port-context";

const FOCUS_ZOOM = 12;
const PORT_COLOR = "#38bdf8";

export function PortDetailCard() {
  const { selected, deselect } = usePortSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { port } = selected;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [port.longitude, port.latitude],
      zoom: FOCUS_ZOOM,
      duration: 1500,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${PORT_COLOR}18, ${PORT_COLOR}08)` }}
          >
            <Anchor size={48} strokeWidth={1.5} style={{ color: PORT_COLOR }} />
            <span className="text-2xl font-bold tracking-wider" style={{ color: PORT_COLOR }}>
              {port.name}
            </span>
            <span className="text-xs font-medium text-muted">
              Maritime Port
            </span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = PORT_COLOR)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              title="Recenter"
            >
              <LocateFixed size={16} />
            </button>
            <button
              onClick={deselect}
              className="p-1 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Location */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors"
              style={{ color: PORT_COLOR }}
            >
              {port.name}
            </button>
            <p className="text-xs text-muted mt-0.5">
              {[port.state, port.country].filter(Boolean).join(", ")}
            </p>
          </div>

          {/* Position */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Coordinates
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Latitude" value={port.latitude.toFixed(4) + "\u00B0"} />
              <Row label="Longitude" value={port.longitude.toFixed(4) + "\u00B0"} />
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              World Port Index
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
