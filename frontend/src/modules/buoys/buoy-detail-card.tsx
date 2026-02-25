import { Navigation, Wind, Waves, Thermometer, Gauge, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useBuoySelection } from "./buoy-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
const BUOY_COLOR = "#22d3ee";

function windDirLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function msToKnots(ms: number): string {
  return (ms * 1.94384).toFixed(1);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

export function BuoyDetailCard() {
  const { selected, deselect } = useBuoySelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { buoy } = selected;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [buoy.longitude, buoy.latitude],
      zoom: FOCUS_ZOOM["buoys"],
      duration: 1500,
    });
  };

  const hasWind = buoy.windSpeed != null || buoy.windDir != null;
  const hasWave = buoy.waveHeight != null || buoy.wavePeriod != null;
  const hasAtmo = buoy.pressure != null || buoy.airTemp != null || buoy.dewPoint != null;

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${BUOY_COLOR}18, ${BUOY_COLOR}08)` }}
          >
            <Navigation size={48} strokeWidth={1.5} style={{ color: BUOY_COLOR }} />
            <span className="text-2xl font-bold tracking-wider" style={{ color: BUOY_COLOR }}>
              {buoy.id}
            </span>
            <span className="text-xs font-medium text-muted">
              Ocean Buoy
            </span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = BUOY_COLOR)}
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
          {/* Timestamp */}
          <div>
            <p className="text-xs text-muted">
              {formatTime(buoy.time)}
            </p>
          </div>

          {/* Wind */}
          {hasWind && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted/60">
                <Wind size={12} />
                Wind
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {buoy.windSpeed != null && (
                  <Row label="Speed" value={`${msToKnots(buoy.windSpeed)} kn`} />
                )}
                {buoy.gust != null && (
                  <Row label="Gust" value={`${msToKnots(buoy.gust)} kn`} />
                )}
                {buoy.windDir != null && (
                  <Row label="Direction" value={`${windDirLabel(buoy.windDir)} (${buoy.windDir}°)`} />
                )}
              </div>
            </div>
          )}

          {/* Waves */}
          {hasWave && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted/60">
                <Waves size={12} />
                Waves
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {buoy.waveHeight != null && (
                  <Row label="Height" value={`${buoy.waveHeight.toFixed(1)} m`} />
                )}
                {buoy.wavePeriod != null && (
                  <Row label="Period" value={`${buoy.wavePeriod.toFixed(1)} s`} />
                )}
              </div>
            </div>
          )}

          {/* Atmosphere */}
          {hasAtmo && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted/60">
                <Gauge size={12} />
                Atmosphere
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {buoy.pressure != null && (
                  <Row label="Pressure" value={`${buoy.pressure.toFixed(1)} hPa`} />
                )}
                {buoy.airTemp != null && (
                  <Row label="Air Temp" value={`${buoy.airTemp.toFixed(1)}°C`} />
                )}
                {buoy.dewPoint != null && (
                  <Row label="Dew Point" value={`${buoy.dewPoint.toFixed(1)}°C`} />
                )}
              </div>
            </div>
          )}

          {/* Water */}
          {buoy.waterTemp != null && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted/60">
                <Thermometer size={12} />
                Water
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <Row label="Water Temp" value={`${buoy.waterTemp.toFixed(1)}°C`} />
              </div>
            </div>
          )}

          <LocationFooter latitude={buoy.latitude} longitude={buoy.longitude} />

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              NOAA NDBC
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
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
