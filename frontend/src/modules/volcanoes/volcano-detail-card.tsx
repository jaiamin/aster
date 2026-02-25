import { Mountain, LocateFixed, X, ExternalLink } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useVolcanoSelection } from "./volcano-context";

const VOLCANO_COLOR = "#e85d04";
const FOCUS_ZOOM = 8;

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function VolcanoDetailCard() {
  const { selected, deselect } = useVolcanoSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { volcano } = selected;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [volcano.longitude, volcano.latitude],
      zoom: FOCUS_ZOOM,
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
            style={{ background: `linear-gradient(135deg, ${VOLCANO_COLOR}18, ${VOLCANO_COLOR}08)` }}
          >
            <Mountain size={48} strokeWidth={1.5} style={{ color: VOLCANO_COLOR }} />
            <span className="text-sm font-medium text-muted">Active Volcano</span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = VOLCANO_COLOR)}
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
          {/* Title */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors"
              style={{ color: VOLCANO_COLOR }}
            >
              {volcano.title}
            </button>
            {volcano.date && (
              <p className="text-xs text-muted mt-0.5">
                Last activity {timeAgo(volcano.date)}
              </p>
            )}
          </div>

          <LocationFooter latitude={volcano.latitude} longitude={volcano.longitude} />

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              NASA EONET
            </span>
            {volcano.sourceUrl && (
              <a
                href={volcano.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-foreground transition-colors"
              >
                Smithsonian GVP <ExternalLink size={10} />
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
      <span className="text-foreground">{value}</span>
    </div>
  );
}
