import { LocateFixed, X, ExternalLink, CloudLightning } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useStormSelection } from "./storm-context";
import { stormAccentColor } from "./storms-layer";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function categoryLabel(category: number, stormType: string): string {
  if (category >= 1) return `Category ${category} Hurricane`;
  if (stormType) return stormType;
  return "Tropical Depression";
}

function formatDirection(deg: number | null): string {
  if (deg == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function StormDetailCard() {
  const { selected, deselect } = useStormSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { storm } = selected;
  const color = stormAccentColor(storm.category);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [storm.longitude, storm.latitude],
      zoom: FOCUS_ZOOM["storms"],
      duration: 1500,
    });
  };

  const nhcUrl = storm.basin === "EP" || storm.basin === "CP"
    ? "https://www.nhc.noaa.gov/gtwo.php?basin=epac"
    : "https://www.nhc.noaa.gov/gtwo.php?basin=atlc";

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            {storm.category >= 1 ? (
              <span className="text-5xl font-bold" style={{ color }}>
                {storm.category}
              </span>
            ) : (
              <CloudLightning size={48} style={{ color }} />
            )}
            <span className="text-sm font-medium text-muted">
              {categoryLabel(storm.category, storm.stormType)}
            </span>
          </div>
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
          {/* Name */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors"
              style={{ color }}
            >
              {storm.name}
            </button>
            {storm.lastUpdated && (
              <p className="text-xs text-muted mt-0.5">{storm.lastUpdated}</p>
            )}
          </div>

          {/* Storm data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Storm Data
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Wind Speed" value={storm.windSpeed != null ? `${storm.windSpeed} kt` : "—"} />
              <Row label="Gusts" value={storm.gust != null ? `${storm.gust} kt` : "—"} />
              <Row label="Pressure" value={storm.pressure != null ? `${storm.pressure} mb` : "—"} />
              <Row
                label="Movement"
                value={
                  storm.movementDir != null || storm.movementSpeed != null
                    ? `${formatDirection(storm.movementDir)}${storm.movementSpeed != null ? ` at ${storm.movementSpeed} kt` : ""}`
                    : "—"
                }
              />
              <Row label="Basin" value={storm.basin || "—"} />
              <Row label="Storm ID" value={storm.id} />
            </div>
          </div>

          <LocationFooter latitude={storm.latitude} longitude={storm.longitude} />

          {/* Source + link */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              NOAA National Hurricane Center
            </span>
            <a
              href={nhcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-foreground transition-colors"
            >
              NHC <ExternalLink size={10} />
            </a>
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
