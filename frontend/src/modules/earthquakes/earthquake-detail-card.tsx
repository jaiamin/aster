import { Activity, AlertTriangle } from "lucide-react";
import {
  DetailCard,
  CardBanner,
  CardHeader,
  CardSection,
  CardGrid,
  CardRow,
  CardCoordinates,
  CardSource,
  CardBody,
} from "@/components/detail-card/detail-card";
import { useMap } from "@vis.gl/react-maplibre";
import { useEarthquakeSelection } from "./earthquake-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { CATEGORY_COLORS } from "@/lib/category-colors";

function magColor(mag: number): string {
  if (mag >= 7) return "#ef4444";
  if (mag >= 5.5) return "#f97316";
  if (mag >= 4) return "#eab308";
  return "#22c55e";
}

function magLabel(mag: number): string {
  if (mag >= 8) return "Great";
  if (mag >= 7) return "Major";
  if (mag >= 6) return "Strong";
  if (mag >= 5) return "Moderate";
  if (mag >= 4) return "Light";
  return "Minor";
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function EarthquakeDetailCard() {
  const { selected, deselect } = useEarthquakeSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { quake } = selected;
  const color = magColor(quake.magnitude);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [quake.longitude, quake.latitude],
      zoom: FOCUS_ZOOM["earthquakes"],
      duration: 1500,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner
        onClose={deselect}
        onRecenter={recenter}
        accentColor={color}
        badge={
          quake.tsunami ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/80 text-white text-xs font-medium">
              <AlertTriangle size={12} />
              Tsunami
            </div>
          ) : undefined
        }
      >
        <div
          className="flex flex-col items-center justify-center h-full gap-1"
          style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
        >
          <span className="text-5xl font-bold" style={{ color }}>
            {quake.magnitude.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-muted">
            {magLabel(quake.magnitude)} Earthquake
          </span>
        </div>
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Activity}
          accentColor={CATEGORY_COLORS["Natural Events"]}
          name={quake.place}
          latitude={quake.latitude}
          longitude={quake.longitude}
          detail={timeAgo(quake.time)}
          onRecenter={recenter}
        />
        <CardSection title="Seismic Data">
          <CardGrid>
            <CardRow label="Magnitude" value={`${quake.magnitude.toFixed(1)} ${quake.magType ?? ""}`} />
            <CardRow label="Depth" value={`${quake.depth.toFixed(1)} km`} />
            <CardRow label="Significance" value={quake.significance != null ? `${quake.significance}` : "—"} />
            {quake.felt != null && <CardRow label="Felt Reports" value={`${quake.felt}`} />}
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={quake.latitude} longitude={quake.longitude} />
        <CardSource name="USGS" url={quake.url ?? "https://earthquake.usgs.gov"} />
      </CardBody>
    </DetailCard>
  );
}
