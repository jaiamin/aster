import { Wind, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useAirQualitySelection } from "./air-quality-context";

const FOCUS_ZOOM = 10;

function aqiCategory(pm25: number): { label: string; color: string } {
  if (pm25 <= 12) return { label: "Good", color: "#00e400" };
  if (pm25 <= 35.4) return { label: "Moderate", color: "#ffff00" };
  if (pm25 <= 55.4) return { label: "Unhealthy for Sensitive Groups", color: "#ff7e00" };
  if (pm25 <= 150.4) return { label: "Unhealthy", color: "#ff0000" };
  if (pm25 <= 250.4) return { label: "Very Unhealthy", color: "#8f3f97" };
  return { label: "Hazardous", color: "#7e0023" };
}

function pm25ToAqi(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ];
  for (const bp of breakpoints) {
    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
      return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow);
    }
  }
  return 500;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AirQualityDetailCard() {
  const { selected, deselect } = useAirQualitySelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { station } = selected;
  const { label, color } = aqiCategory(station.pm25);
  const aqi = pm25ToAqi(station.pm25);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [station.longitude, station.latitude],
      zoom: FOCUS_ZOOM,
      duration: 1500,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* AQI banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <span className="text-5xl font-bold" style={{ color }}>
              {aqi}
            </span>
            <span className="text-sm font-medium text-muted">
              AQI — {label}
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
          {/* Station name */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors"
              style={{ color }}
            >
              {station.name}
            </button>
            <p className="text-xs text-muted mt-0.5">
              {[station.city, station.country].filter(Boolean).join(", ") || "Unknown location"}
              {station.lastUpdated && ` · ${timeAgo(station.lastUpdated)}`}
            </p>
          </div>

          {/* Measurement data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Air Quality Data
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="PM2.5" value={`${station.pm25} ${station.unit}`} />
              <Row label="AQI" value={`${aqi}`} />
              <Row label="Category" value={label} />
            </div>
          </div>

          <LocationFooter latitude={station.latitude} longitude={station.longitude} />

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              OpenAQ
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
