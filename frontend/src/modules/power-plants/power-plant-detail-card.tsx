import { Zap, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { SpinningAerialBanner } from "@/components/detail-card/spinning-aerial-banner";
import { useMap } from "@vis.gl/react-maplibre";
import { usePowerPlantSelection } from "./power-plant-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function fuelColor(fuel: string): string {
  switch (fuel) {
    case "Coal": return "#6b7280";
    case "Gas": return "#f59e0b";
    case "Oil": return "#78716c";
    case "Hydro": return "#3b82f6";
    case "Solar": return "#eab308";
    case "Wind": return "#06b6d4";
    case "Nuclear": return "#a855f7";
    case "Geothermal": return "#ef4444";
    case "Biomass": return "#22c55e";
    case "Waste": return "#a3a3a3";
    default: return "#6b7280";
  }
}

export function PowerPlantDetailCard() {
  const { selected, deselect } = usePowerPlantSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { plant } = selected;
  const color = fuelColor(plant.fuelType);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [plant.longitude, plant.latitude],
      zoom: FOCUS_ZOOM["power-plants"],
      duration: 1500,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <SpinningAerialBanner
            latitude={plant.latitude}
            longitude={plant.longitude}
            zoom={15}
            fallback={
              <div
                className="w-full h-[140px] flex flex-col items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
              >
                <Zap size={48} strokeWidth={1.5} style={{ color }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
                  style={{ color, borderColor: color, border: "1px solid" }}
                >
                  {plant.fuelType}
                </span>
              </div>
            }
          />
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
              {plant.name}
            </button>
            <p className="text-xs text-muted mt-0.5">{plant.country}</p>
          </div>

          {/* Plant Details */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Plant Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Fuel" value={plant.fuelType} />
              <Row label="Capacity" value={`${plant.capacityMw} MW`} />
              {plant.owner && <Row label="Owner" value={plant.owner} />}
              {plant.commissioningYear != null && (
                <Row label="Commissioned" value={String(plant.commissioningYear)} />
              )}
            </div>
          </div>

          <LocationFooter latitude={plant.latitude} longitude={plant.longitude} />

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              WRI Global Power Plant Database
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
