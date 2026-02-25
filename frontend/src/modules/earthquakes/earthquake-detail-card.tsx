import { Activity, LocateFixed, X, ExternalLink, AlertTriangle } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useEarthquakeSelection } from "./earthquake-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function magColor(mag: number): string {
  if (mag >= 7) return "#ef4444";
  if (mag >= 5.5) return "#f97316";
  if (mag >= 4) return "#eab308";
  return "#22c55e";
}

function magLabel(mag: number): string {
  if (mag >= 8) return "Great";
  if (mag >= 7) return "Major";
  if (mag >= 6) return "Strong";
  if (mag >= 5) return "Moderate";
  if (mag >= 4) return "Light";
  return "Minor";
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function EarthquakeDetailCard() {
  const { selected, deselect } = useEarthquakeSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { quake } = selected;
  const color = magColor(quake.magnitude);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [quake.longitude, quake.latitude],
      zoom: FOCUS_ZOOM["earthquakes"],
      duration: 1500,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Magnitude banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <span className="text-5xl font-bold" style={{ color }}>
              {quake.magnitude.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-muted">
              {magLabel(quake.magnitude)} Earthquake
            </span>
          </div>
          {quake.tsunami && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-red-500/80 text-white text-xs font-medium">
              <AlertTriangle size={12} />
              Tsunami
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
              style={{ ["--tw-text-opacity" as string]: 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = color)}
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
              style={{ color }}
            >
              {quake.place}
            </button>
            <p className="text-xs text-muted mt-0.5">{timeAgo(quake.time)}</p>
          </div>

          {/* Seismic data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Seismic Data
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Magnitude" value={`${quake.magnitude.toFixed(1)} ${quake.magType ?? ""}`} />
              <Row label="Depth" value={`${quake.depth.toFixed(1)} km`} />
              <Row label="Significance" value={quake.significance != null ? `${quake.significance}` : "—"} />
              {quake.felt != null && <Row label="Felt Reports" value={`${quake.felt}`} />}
            </div>
          </div>

          <LocationFooter latitude={quake.latitude} longitude={quake.longitude} />

          {/* Status + link */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50 capitalize">
              {quake.status ?? "automatic"} {quake.alert ? `· Alert: ${quake.alert}` : ""}
            </span>
            {quake.url && (
              <a
                href={quake.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-foreground transition-colors"
              >
                USGS <ExternalLink size={10} />
              </a>
            )}
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
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
