import { Rocket, LocateFixed, X, ExternalLink } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { SpinningAerialBanner } from "@/components/detail-card/spinning-aerial-banner";
import { useMap } from "@vis.gl/react-maplibre";
import { useLaunchSelection } from "./launch-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function statusColor(status: string): string {
  if (status === "Success") return "#3b82f6";
  if (status === "Failure" || status === "Partial Failure") return "#ef4444";
  return "#22c55e";
}

function formatLaunchTime(net: string): string {
  const date = new Date(net);
  const now = Date.now();
  const diff = date.getTime() - now;

  if (diff > 0) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) {
      const mins = Math.floor(diff / 60_000);
      return `T-${mins}m`;
    }
    if (hours < 24) return `T-${hours}h`;
    const days = Math.floor(hours / 24);
    return `T-${days}d`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LaunchDetailCard() {
  const { selected, deselect } = useLaunchSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { launch } = selected;
  const color = statusColor(launch.status);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [launch.longitude, launch.latitude],
      zoom: FOCUS_ZOOM["launches"],
      duration: 1500,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          {launch.image ? (
            <img
              src={launch.image}
              alt={launch.name}
              className="w-full h-[140px] object-cover"
            />
          ) : (
            <SpinningAerialBanner
              latitude={launch.latitude}
              longitude={launch.longitude}
              zoom={14}
              fallback={
                <div
                  className="w-full h-[140px] flex flex-col items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
                >
                  <Rocket size={48} strokeWidth={1.5} style={{ color }} />
                </div>
              }
            />
          )}
          <div className="absolute top-2 left-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
              style={{ color: "#fff", backgroundColor: color }}
            >
              {launch.status}
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
          {/* Name + time */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors text-left"
              style={{ color }}
            >
              {launch.name}
            </button>
            <p className="text-xs text-muted mt-0.5">{formatLaunchTime(launch.net)}</p>
          </div>

          {/* Launch details */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Launch Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Provider" value={launch.provider} />
              <Row label="Rocket" value={launch.rocketName} />
              {launch.missionName && <Row label="Mission" value={launch.missionName} />}
              {launch.missionOrbit && <Row label="Orbit" value={launch.missionOrbit} />}
              {launch.probability != null && (
                <Row label="Probability" value={`${launch.probability}%`} />
              )}
            </div>
          </div>

          {/* Pad info */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Launch Pad
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Pad" value={launch.padName} />
              <Row label="Location" value={launch.padLocation} />
            </div>
          </div>

          {launch.missionDescription && (
            <p className="text-xs text-muted leading-relaxed line-clamp-3">
              {launch.missionDescription}
            </p>
          )}

          <LocationFooter latitude={launch.latitude} longitude={launch.longitude} />

          {/* Link */}
          <div className="flex items-center justify-end pt-1 border-t border-panel-border">
            {launch.url && (
              <a
                href={launch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-foreground transition-colors"
              >
                Launch Library <ExternalLink size={10} />
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
