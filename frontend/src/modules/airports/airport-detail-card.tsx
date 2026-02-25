import { PlaneTakeoff, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useAirportSelection } from "./airport-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function typeLabel(type: string): string {
  switch (type) {
    case "large_airport": return "Large Airport";
    case "medium_airport": return "Medium Airport";
    default: return "Airport";
  }
}

function typeColor(type: string): string {
  switch (type) {
    case "large_airport": return "#00d4ff";
    case "medium_airport": return "#5b9bd5";
    default: return "#5b9bd5";
  }
}

export function AirportDetailCard() {
  const { selected, deselect } = useAirportSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { airport } = selected;
  const color = typeColor(airport.type);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [airport.longitude, airport.latitude],
      zoom: FOCUS_ZOOM["airports"],
      duration: 1500,
    });
  };

  const codes = [airport.iata, airport.icao].filter(Boolean).join(" / ");

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <PlaneTakeoff size={48} strokeWidth={1.5} style={{ color }} />
            {codes && (
              <span className="text-2xl font-bold tracking-wider" style={{ color }}>
                {codes}
              </span>
            )}
            <span className="text-xs font-medium text-muted">
              {typeLabel(airport.type)}
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
          {/* Name */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors"
              style={{ color }}
            >
              {airport.name}
            </button>
            <p className="text-xs text-muted mt-0.5">
              {[airport.municipality, airport.country].filter(Boolean).join(", ")}
            </p>
          </div>

          {/* Airport data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Airport Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {airport.iata && <Row label="IATA" value={airport.iata} />}
              {airport.icao && <Row label="ICAO" value={airport.icao} />}
              <Row label="Type" value={typeLabel(airport.type)} />
              {airport.elevation != null && (
                <Row label="Elevation" value={`${airport.elevation.toLocaleString()} ft`} />
              )}
            </div>
          </div>

          <LocationFooter
            latitude={airport.latitude}
            longitude={airport.longitude}
            altitude={airport.elevation ?? undefined}
            altitudeLabel="Elevation"
          />

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              OurAirports
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
