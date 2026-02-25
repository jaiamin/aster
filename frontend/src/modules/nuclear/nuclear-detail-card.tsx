import { Radiation, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useNuclearSelection } from "./nuclear-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function statusColor(status: string): string {
  switch (status) {
    case "Operational": return "#00e400";
    case "Under Construction": return "#ffff00";
    case "Planned": return "#00bfff";
    case "Suspended Operation":
    case "Suspended Construction": return "#ff7e00";
    case "Shutdown":
    case "Decommissioning Completed":
    case "Cancelled Construction":
    case "Never Commissioned": return "#888888";
    default: return "#888888";
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function NuclearDetailCard() {
  const { selected, deselect } = useNuclearSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { facility } = selected;
  const color = statusColor(facility.status);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [facility.longitude, facility.latitude],
      zoom: FOCUS_ZOOM["nuclear"],
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
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <Radiation size={48} strokeWidth={1.5} style={{ color }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
              style={{ color, borderColor: color, border: "1px solid" }}
            >
              {facility.status}
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
              {facility.name}
            </button>
            <p className="text-xs text-muted mt-0.5">
              {facility.country ?? "Unknown location"}
            </p>
          </div>

          {/* Reactor data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Reactor Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {facility.reactorType && (
                <Row label="Type" value={facility.reactorType} />
              )}
              {facility.reactorModel && (
                <Row label="Model" value={facility.reactorModel} />
              )}
              {facility.capacity != null && (
                <Row label="Capacity" value={`${facility.capacity} MW`} />
              )}
              <Row label="Status" value={facility.status} />
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Timeline
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Operational" value={formatDate(facility.operationalFrom)} />
              {facility.operationalTo && (
                <Row label="Shutdown" value={formatDate(facility.operationalTo)} />
              )}
            </div>
          </div>

          <LocationFooter latitude={facility.latitude} longitude={facility.longitude} />

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              {facility.source ?? "IAEA/WNA"}
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
