import { Flame } from "lucide-react";
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
import { useWildfireSelection } from "./wildfire-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { CATEGORY_COLORS } from "@/lib/category-colors";

function frpColor(frp: number): string {
  if (frp >= 200) return "#f44336";
  if (frp >= 50) return "#ff5722";
  if (frp >= 20) return "#ff9800";
  return "#ffcc02";
}

function frpLabel(frp: number): string {
  if (frp >= 500) return "Extreme";
  if (frp >= 200) return "Very High";
  if (frp >= 50) return "High";
  if (frp >= 20) return "Moderate";
  return "Low";
}

function confidenceLabel(c: string): string {
  if (c === "high" || c === "h") return "High";
  if (c === "nominal" || c === "n") return "Nominal";
  if (c === "low" || c === "l") return "Low";
  return c || "—";
}

function formatAcqTime(date: string, time: string): string {
  if (!date) return "—";
  const padded = time.padStart(4, "0");
  return `${date} ${padded.slice(0, 2)}:${padded.slice(2)} UTC`;
}

export function WildfireDetailCard() {
  const { selected, deselect } = useWildfireSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { fire } = selected;
  const color = frpColor(fire.frp);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [fire.longitude, fire.latitude],
      zoom: FOCUS_ZOOM["wildfires"],
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={color}>
        <div
          className="flex flex-col items-center justify-center h-full gap-1"
          style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
        >
          <Flame size={48} strokeWidth={1.5} style={{ color }} />
          <span className="text-2xl font-bold" style={{ color }}>
            {fire.frp.toFixed(1)} MW
          </span>
          <span className="text-sm font-medium text-muted">
            {frpLabel(fire.frp)} Intensity
          </span>
        </div>
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Flame}
          accentColor={CATEGORY_COLORS["Events"]}
          name="Fire Hotspot"
          latitude={fire.latitude}
          longitude={fire.longitude}
          detail={`Detected ${formatAcqTime(fire.acqDate, fire.acqTime)}`}
          onRecenter={recenter}
        />
        <CardSection title="Thermal Data">
          <CardGrid>
            <CardRow label="FRP" value={`${fire.frp.toFixed(1)} MW`} />
            <CardRow label="Brightness" value={`${fire.brightness.toFixed(1)} K`} />
            <CardRow label="Confidence" value={confidenceLabel(fire.confidence)} />
            <CardRow label="Day/Night" value={fire.daynight === "D" ? "Daytime" : "Nighttime"} />
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={fire.latitude} longitude={fire.longitude} />
        <CardSource name="NASA FIRMS" url="https://firms.modaps.eosdis.nasa.gov" />
      </CardBody>
    </DetailCard>
  );
}
