import { useEffect, useState } from "react";
import { Ship as ShipIcon, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useShipSelection } from "./ship-context";

const FOCUS_ZOOM = 10;

// AIS ship type code → human-readable category
const SHIP_TYPE_LABELS: Record<number, string> = {
  20: "Wing in Ground",
  30: "Fishing",
  31: "Towing",
  32: "Towing (large)",
  33: "Dredging",
  34: "Diving Ops",
  35: "Military Ops",
  36: "Sailing",
  37: "Pleasure Craft",
  40: "High-Speed Craft",
  50: "Pilot Vessel",
  51: "Search & Rescue",
  52: "Tug",
  53: "Port Tender",
  54: "Anti-Pollution",
  55: "Law Enforcement",
  58: "Medical Transport",
  59: "Special Craft",
  60: "Passenger",
  70: "Cargo",
  80: "Tanker",
  90: "Other",
};

function getShipTypeLabel(code: number | null): string {
  if (code == null) return "Unknown";
  // Exact match first
  if (SHIP_TYPE_LABELS[code]) return SHIP_TYPE_LABELS[code];
  // AIS types are grouped in decades (60-69 = Passenger, 70-79 = Cargo, etc.)
  const decade = Math.floor(code / 10) * 10;
  if (SHIP_TYPE_LABELS[decade]) return SHIP_TYPE_LABELS[decade];
  return "Unknown";
}

function useElapsed(since: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (since == null) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);

  return elapsed;
}

export function ShipDetailCard() {
  const { selected, deselect, fetchedAt, tracking, resumeTracking } = useShipSelection();
  const { current: mapRef } = useMap();
  const elapsed = useElapsed(fetchedAt);

  if (!selected) return null;

  const { ship } = selected;
  const typeLabel = getShipTypeLabel(ship.shipType);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [ship.longitude, ship.latitude],
      zoom: FOCUS_ZOOM,
      duration: 1500,
    });
    map.once("moveend", () => resumeTracking());
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header image area */}
        <div className="relative">
          <div className="w-full h-[140px] bg-surface flex items-center justify-center">
            <ShipIcon size={64} strokeWidth={1} className="text-accent/20" />
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="p-1 bg-black/50 text-white/80 hover:text-accent hover:bg-black/70 transition-colors"
              title="Recenter on ship"
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
            <div className="flex items-baseline justify-between gap-2">
              <button
                onClick={recenter}
                className={`text-lg font-semibold transition-colors ${
                  tracking ? "text-accent" : "text-accent/60 hover:text-accent"
                }`}
              >
                {ship.name || `MMSI ${ship.mmsi}`}
              </button>
              <span className="text-xs text-muted">{typeLabel}</span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              MMSI {ship.mmsi}
            </p>
          </div>

          {/* Vessel Data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Vessel Data
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row
                label="Speed"
                value={ship.speed != null ? `${ship.speed.toFixed(1)} kts` : "—"}
              />
              <Row
                label="Course"
                value={ship.course != null ? `${Math.round(ship.course)}°` : "—"}
              />
              <Row
                label="Heading"
                value={ship.heading != null ? `${Math.round(ship.heading)}°` : "—"}
              />
              <Row
                label="Type Code"
                value={ship.shipType != null ? `${ship.shipType}` : "—"}
              />
            </div>
          </div>

          <LocationFooter latitude={ship.latitude} longitude={ship.longitude} />

          {/* Last updated */}
          <div className="text-[11px] text-muted/50 text-center pt-1 border-t border-panel-border">
            Last updated {elapsed}s ago
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
