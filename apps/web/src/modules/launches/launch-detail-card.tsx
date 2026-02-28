import { useMap } from "@vis.gl/react-maplibre";
import { Rocket } from "lucide-react";
import { memo, useState } from "react";

import { useLaunchSelection } from "./launch-context";

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
import { SpinningAerialBanner } from "@/components/detail-card/spinning-aerial-banner";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function LaunchImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <div className="relative w-full h-[140px] bg-surface">
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-surface" />}
      {status === "error" ? (
        <div className="w-full h-[140px] flex items-center justify-center bg-surface">
          <Rocket size={48} strokeWidth={1.5} className="text-white" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: status === "loaded" ? 1 : 0 }}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
    </div>
  );
}

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

export const LaunchDetailCard = memo(function LaunchDetailCard() {
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
      padding: DETAIL_CARD_PADDING,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner
        onClose={deselect}
        onRecenter={recenter}
        accentColor={color}
        badge={
          <span
            className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
            style={{ color: "#fff", backgroundColor: color }}
          >
            {launch.status}
          </span>
        }
      >
        {launch.image ? (
          <LaunchImage src={launch.image} alt={launch.name} />
        ) : (
          <SpinningAerialBanner
            latitude={launch.latitude}
            longitude={launch.longitude}
            zoom={14}
            fallback={
              <div className="w-full h-[140px] flex items-center justify-center bg-surface">
                <Rocket size={48} strokeWidth={1.5} className="text-white" />
              </div>
            }
          />
        )}
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Rocket}
          accentColor={CATEGORY_COLORS["Events"]}
          name={launch.name}
          latitude={launch.latitude}
          longitude={launch.longitude}
          detail={formatLaunchTime(launch.net)}
          onRecenter={recenter}
        />
        <CardSection title="Launch Details">
          <CardGrid>
            <CardRow label="Provider" value={launch.provider} />
            <CardRow label="Rocket" value={launch.rocketName} />
            {launch.missionName && <CardRow label="Mission" value={launch.missionName} />}
            {launch.missionOrbit && <CardRow label="Orbit" value={launch.missionOrbit} />}
            {launch.probability != null && (
              <CardRow label="Probability" value={`${launch.probability}%`} />
            )}
          </CardGrid>
        </CardSection>
        <CardSection title="Launch Pad">
          <CardGrid>
            <CardRow label="Pad" value={launch.padName} />
          </CardGrid>
        </CardSection>
        {launch.missionDescription && (
          <p className="text-xs text-muted leading-relaxed line-clamp-3">
            {launch.missionDescription}
          </p>
        )}
        <CardCoordinates latitude={launch.latitude} longitude={launch.longitude} />
        <CardSource name="Launch Library" url={launch.url ?? "https://thespacedevs.com"} />
      </CardBody>
    </DetailCard>
  );
});
