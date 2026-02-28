import { useMap } from "@vis.gl/react-maplibre";
import { CloudLightning } from "lucide-react";
import { memo } from "react";

import { useStormSelection } from "./storm-context";
import { stormAccentColor } from "./storms-layer";

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
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function categoryLabel(category: number, stormType: string): string {
  if (category >= 1) return `Category ${category} Hurricane`;
  if (stormType) return stormType;
  return "Tropical Depression";
}

function formatDirection(deg: number | null): string {
  if (deg == null) return "—";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

export const StormDetailCard = memo(function StormDetailCard() {
  const { selected, deselect } = useStormSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { storm } = selected;
  const color = stormAccentColor(storm.category);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [storm.longitude, storm.latitude],
      zoom: FOCUS_ZOOM["storms"],
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
  };

  const nhcUrl =
    storm.basin === "EP" || storm.basin === "CP"
      ? "https://www.nhc.noaa.gov/gtwo.php?basin=epac"
      : "https://www.nhc.noaa.gov/gtwo.php?basin=atlc";

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={color}>
        <div
          className="flex flex-col items-center justify-center h-full gap-1"
          style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
        >
          {storm.category >= 1 ? (
            <span className="text-5xl font-bold" style={{ color }}>
              {storm.category}
            </span>
          ) : (
            <CloudLightning size={48} style={{ color }} />
          )}
          <span className="text-sm font-medium text-muted">
            {categoryLabel(storm.category, storm.stormType)}
          </span>
        </div>
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={CloudLightning}
          accentColor={CATEGORY_COLORS["Events"]}
          name={storm.name}
          latitude={storm.latitude}
          longitude={storm.longitude}
          detail={storm.lastUpdated ?? undefined}
          onRecenter={recenter}
        />
        <CardSection title="Storm Data">
          <CardGrid>
            <CardRow
              label="Wind Speed"
              value={storm.windSpeed != null ? `${storm.windSpeed} kt` : "—"}
            />
            <CardRow label="Gusts" value={storm.gust != null ? `${storm.gust} kt` : "—"} />
            <CardRow
              label="Pressure"
              value={storm.pressure != null ? `${storm.pressure} mb` : "—"}
            />
            <CardRow
              label="Movement"
              value={
                storm.movementDir != null || storm.movementSpeed != null
                  ? `${formatDirection(storm.movementDir)}${storm.movementSpeed != null ? ` at ${storm.movementSpeed} kt` : ""}`
                  : "—"
              }
            />
            <CardRow label="Basin" value={storm.basin || "—"} />
            <CardRow label="Storm ID" value={storm.id} />
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={storm.latitude} longitude={storm.longitude} />
        <CardSource name="NOAA NHC" url={nhcUrl} />
      </CardBody>
    </DetailCard>
  );
});
