import { useMap } from "@vis.gl/react-maplibre";
import { Navigation, Wind as WindIcon, Waves, Thermometer, Gauge } from "lucide-react";
import { memo } from "react";

import { useBuoySelection } from "./buoy-context";

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

const BUOY_COLOR = "#22d3ee";

function windDirLabel(deg: number): string {
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

function msToKnots(ms: number): string {
  return (ms * 1.94384).toFixed(1);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

export const BuoyDetailCard = memo(function BuoyDetailCard() {
  const { selected, deselect } = useBuoySelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { buoy } = selected;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [buoy.longitude, buoy.latitude],
      zoom: FOCUS_ZOOM["buoys"],
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
  };

  const hasWind = buoy.windSpeed != null || buoy.windDir != null;
  const hasWave = buoy.waveHeight != null || buoy.wavePeriod != null;
  const hasAtmo = buoy.pressure != null || buoy.airTemp != null || buoy.dewPoint != null;

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={BUOY_COLOR}>
        <div
          className="flex flex-col items-center justify-center h-full gap-2"
          style={{ background: `linear-gradient(135deg, ${BUOY_COLOR}18, ${BUOY_COLOR}08)` }}
        >
          <Navigation size={48} strokeWidth={1.5} style={{ color: BUOY_COLOR }} />
          <span className="text-2xl font-bold tracking-wider" style={{ color: BUOY_COLOR }}>
            {buoy.id}
          </span>
          <span className="text-xs font-medium text-muted">Ocean Buoy</span>
        </div>
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Navigation}
          accentColor={CATEGORY_COLORS["Environment"]}
          name={buoy.id}
          latitude={buoy.latitude}
          longitude={buoy.longitude}
          detail={formatTime(buoy.time)}
          onRecenter={recenter}
        />

        {hasWind && (
          <CardSection title="Wind" icon={WindIcon}>
            <CardGrid>
              {buoy.windSpeed != null && (
                <CardRow label="Speed" value={`${msToKnots(buoy.windSpeed)} kn`} />
              )}
              {buoy.gust != null && <CardRow label="Gust" value={`${msToKnots(buoy.gust)} kn`} />}
              {buoy.windDir != null && (
                <CardRow
                  label="Direction"
                  value={`${windDirLabel(buoy.windDir)} (${buoy.windDir}°)`}
                />
              )}
            </CardGrid>
          </CardSection>
        )}

        {hasWave && (
          <CardSection title="Waves" icon={Waves}>
            <CardGrid>
              {buoy.waveHeight != null && (
                <CardRow label="Height" value={`${buoy.waveHeight.toFixed(1)} m`} />
              )}
              {buoy.wavePeriod != null && (
                <CardRow label="Period" value={`${buoy.wavePeriod.toFixed(1)} s`} />
              )}
            </CardGrid>
          </CardSection>
        )}

        {hasAtmo && (
          <CardSection title="Atmosphere" icon={Gauge}>
            <CardGrid>
              {buoy.pressure != null && (
                <CardRow label="Pressure" value={`${buoy.pressure.toFixed(1)} hPa`} />
              )}
              {buoy.airTemp != null && (
                <CardRow label="Air Temp" value={`${buoy.airTemp.toFixed(1)}°C`} />
              )}
              {buoy.dewPoint != null && (
                <CardRow label="Dew Point" value={`${buoy.dewPoint.toFixed(1)}°C`} />
              )}
            </CardGrid>
          </CardSection>
        )}

        {buoy.waterTemp != null && (
          <CardSection title="Water" icon={Thermometer}>
            <CardGrid>
              <CardRow label="Water Temp" value={`${buoy.waterTemp.toFixed(1)}°C`} />
            </CardGrid>
          </CardSection>
        )}

        <CardCoordinates latitude={buoy.latitude} longitude={buoy.longitude} />
        <CardSource name="NOAA NDBC" url="https://www.ndbc.noaa.gov" />
      </CardBody>
    </DetailCard>
  );
});
