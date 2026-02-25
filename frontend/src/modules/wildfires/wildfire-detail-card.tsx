import { Flame, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useWildfireSelection } from "./wildfire-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function frpColor(frp: number): string {
  if (frp >= 200) return "#f44336";
  if (frp >= 50) return "#ff5722";
  if (frp >= 20) return "#ff9800";
  return "#ffcc02";
}

function frpLabel(frp: number): string {
  if (frp >= 500) return "Extreme";
  if (frp >= 200) return "Very High";
  if (frp >= 50) return "High";
  if (frp >= 20) return "Moderate";
  return "Low";
}

function confidenceLabel(c: string): string {
  if (c === "high" || c === "h") return "High";
  if (c === "nominal" || c === "n") return "Nominal";
  if (c === "low" || c === "l") return "Low";
  return c || "—";
}

function formatAcqTime(date: string, time: string): string {
  if (!date) return "—";
  const padded = time.padStart(4, "0");
  return `${date} ${padded.slice(0, 2)}:${padded.slice(2)} UTC`;
}

export function WildfireDetailCard() {
  const { selected, deselect } = useWildfireSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { fire } = selected;
  const color = frpColor(fire.frp);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [fire.longitude, fire.latitude],
      zoom: FOCUS_ZOOM["wildfires"],
      duration: 1500,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* FRP banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <Flame size={48} strokeWidth={1.5} style={{ color }} />
            <span className="text-2xl font-bold" style={{ color }}>
              {fire.frp.toFixed(1)} MW
            </span>
            <span className="text-sm font-medium text-muted">
              {frpLabel(fire.frp)} Intensity
            </span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
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
          {/* Header */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors"
              style={{ color }}
            >
              Fire Hotspot
            </button>
            <p className="text-xs text-muted mt-0.5">
              Detected {formatAcqTime(fire.acqDate, fire.acqTime)}
            </p>
          </div>

          {/* Fire data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Thermal Data
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="FRP" value={`${fire.frp.toFixed(1)} MW`} />
              <Row label="Brightness" value={`${fire.brightness.toFixed(1)} K`} />
              <Row label="Confidence" value={confidenceLabel(fire.confidence)} />
              <Row label="Day/Night" value={fire.daynight === "D" ? "Daytime" : "Nighttime"} />
            </div>
          </div>

          <LocationFooter latitude={fire.latitude} longitude={fire.longitude} />

          {/* Source */}
          <div className="text-[11px] text-muted/50 text-center pt-1 border-t border-panel-border">
            VIIRS / Suomi NPP · NASA FIRMS
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
