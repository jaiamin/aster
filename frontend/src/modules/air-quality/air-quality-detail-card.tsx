import { Wind } from "lucide-react";
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
import { useAirQualitySelection } from "./air-quality-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { CATEGORY_COLORS } from "@/lib/category-colors";

function aqiCategory(pm25: number): { label: string; color: string } {
  if (pm25 <= 12) return { label: "Good", color: "#00e400" };
  if (pm25 <= 35.4) return { label: "Moderate", color: "#ffff00" };
  if (pm25 <= 55.4) return { label: "Unhealthy for Sensitive Groups", color: "#ff7e00" };
  if (pm25 <= 150.4) return { label: "Unhealthy", color: "#ff0000" };
  if (pm25 <= 250.4) return { label: "Very Unhealthy", color: "#8f3f97" };
  return { label: "Hazardous", color: "#7e0023" };
}

function pm25ToAqi(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ];
  for (const bp of breakpoints) {
    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
      return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow);
    }
  }
  return 500;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AirQualityDetailCard() {
  const { selected, deselect } = useAirQualitySelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { station } = selected;
  const { label, color } = aqiCategory(station.pm25);
  const aqi = pm25ToAqi(station.pm25);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [station.longitude, station.latitude],
      zoom: FOCUS_ZOOM["air-quality"],
      duration: 1500,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={color}>
        <div
          className="flex flex-col items-center justify-center h-full gap-1"
          style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
        >
          <span className="text-5xl font-bold" style={{ color }}>
            {aqi}
          </span>
          <span className="text-sm font-medium text-muted">
            AQI — {label}
          </span>
        </div>
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Wind}
          accentColor={CATEGORY_COLORS["Environment"]}
          name={station.name}
          latitude={station.latitude}
          longitude={station.longitude}
          detail={station.lastUpdated ? timeAgo(station.lastUpdated) : undefined}
          onRecenter={recenter}
        />
        <CardSection title="Air Quality Data">
          <CardGrid>
            <CardRow label="PM2.5" value={`${station.pm25} ${station.unit}`} />
            <CardRow label="AQI" value={`${aqi}`} />
            <CardRow label="Category" value={label} />
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={station.latitude} longitude={station.longitude} />
        <CardSource name="OpenAQ" url="https://openaq.org" />
      </CardBody>
    </DetailCard>
  );
}
