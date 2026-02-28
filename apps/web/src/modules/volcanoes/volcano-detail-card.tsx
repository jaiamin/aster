import { useMap } from "@vis.gl/react-maplibre";
import { Mountain } from "lucide-react";
import { memo } from "react";

import { useVolcanoSelection } from "./volcano-context";

import {
  DetailCard,
  CardBanner,
  CardHeader,
  CardCoordinates,
  CardSource,
  CardBody,
} from "@/components/detail-card/detail-card";
import { SpinningAerialBanner } from "@/components/detail-card/spinning-aerial-banner";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

const VOLCANO_COLOR = "#e85d04";

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

export const VolcanoDetailCard = memo(function VolcanoDetailCard() {
  const { selected, deselect } = useVolcanoSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { volcano } = selected;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [volcano.longitude, volcano.latitude],
      zoom: FOCUS_ZOOM["volcanoes"],
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={VOLCANO_COLOR}>
        <SpinningAerialBanner
          latitude={volcano.latitude}
          longitude={volcano.longitude}
          zoom={13}
          fallback={
            <div className="w-full h-[140px] flex items-center justify-center bg-surface">
              <Mountain size={48} strokeWidth={1.5} className="text-white" />
            </div>
          }
        />
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Mountain}
          accentColor={CATEGORY_COLORS["Events"]}
          name={volcano.title}
          latitude={volcano.latitude}
          longitude={volcano.longitude}
          detail={volcano.date ? `Last activity ${timeAgo(volcano.date)}` : undefined}
          onRecenter={recenter}
        />
        <CardCoordinates latitude={volcano.latitude} longitude={volcano.longitude} />
        <CardSource name="NASA EONET" url="https://eonet.gsfc.nasa.gov" />
      </CardBody>
    </DetailCard>
  );
});
