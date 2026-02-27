import { PlaneTakeoff } from "lucide-react";
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
import { useMap } from "@vis.gl/react-maplibre";
import { useAirportSelection } from "./airport-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { CATEGORY_COLORS } from "@/lib/category-colors";

function typeLabel(type: string): string {
  switch (type) {
    case "large_airport": return "Large Airport";
    case "medium_airport": return "Medium Airport";
    default: return "Airport";
  }
}

function typeColor(type: string): string {
  switch (type) {
    case "large_airport": return "#3d7ab5";
    case "medium_airport": return "#5b9bd5";
    default: return "#5b9bd5";
  }
}

export function AirportDetailCard() {
  const { selected, deselect } = useAirportSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { airport } = selected;
  const color = typeColor(airport.type);
  const codes = [airport.iata, airport.icao].filter(Boolean).join(" / ");

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [airport.longitude, airport.latitude],
      zoom: FOCUS_ZOOM["airports"],
      duration: 1500,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={color}>
        <SpinningAerialBanner
          latitude={airport.latitude}
          longitude={airport.longitude}
          zoom={15}
          fallback={
            <div className="w-full h-[140px] flex items-center justify-center bg-surface">
              <PlaneTakeoff size={48} strokeWidth={1.5} className="text-white" />
            </div>
          }
        />
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={PlaneTakeoff}
          accentColor={CATEGORY_COLORS["Infrastructure"]}
          name={`[${airport.iata || airport.icao || airport.id}] ${airport.name}`}
          latitude={airport.latitude}
          longitude={airport.longitude}
          onRecenter={recenter}
        />
        <CardSection title="Details">
          <CardGrid>
            <CardRow label="Type" value={typeLabel(airport.type)} />
            {airport.iata && <CardRow label="IATA" value={airport.iata} />}
            {airport.icao && <CardRow label="ICAO" value={airport.icao} />}
            {airport.municipality && <CardRow label="City" value={airport.municipality} />}
            {airport.region && <CardRow label="Region" value={airport.region} />}
            {airport.country && <CardRow label="Country" value={airport.country} />}
          </CardGrid>
        </CardSection>
        <CardCoordinates
          latitude={airport.latitude}
          longitude={airport.longitude}
          altitude={airport.elevation ?? undefined}
          altitudeLabel="Elevation"
        />
        <CardSource name="OurAirports" url="https://ourairports.com" />
      </CardBody>
    </DetailCard>
  );
}
