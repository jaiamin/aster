import { useEffect, useState } from "react";
import { Ship as ShipIcon } from "lucide-react";
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
import { useShipSelection } from "./ship-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { CATEGORY_COLORS } from "@/lib/category-colors";

const SHIP_TYPE_LABELS: Record<number, string> = {
  20: "Wing in Ground",
  30: "Fishing",
  31: "Towing",
  32: "Towing (large)",
  33: "Dredging",
  34: "Diving Ops",
  35: "Military Ops",
  36: "Sailing",
  37: "Pleasure Craft",
  40: "High-Speed Craft",
  50: "Pilot Vessel",
  51: "Search & Rescue",
  52: "Tug",
  53: "Port Tender",
  54: "Anti-Pollution",
  55: "Law Enforcement",
  58: "Medical Transport",
  59: "Special Craft",
  60: "Passenger",
  70: "Cargo",
  80: "Tanker",
  90: "Other",
};

function getShipTypeLabel(code: number | null): string {
  if (code == null) return "Unknown";
  if (SHIP_TYPE_LABELS[code]) return SHIP_TYPE_LABELS[code];
  const decade = Math.floor(code / 10) * 10;
  if (SHIP_TYPE_LABELS[decade]) return SHIP_TYPE_LABELS[decade];
  return "Unknown";
}

function useElapsed(since: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (since == null) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);

  return elapsed;
}

export function ShipDetailCard() {
  const { selected, deselect, fetchedAt, tracking, resumeTracking } = useShipSelection();
  const { current: mapRef } = useMap();
  const elapsed = useElapsed(fetchedAt);

  if (!selected) return null;

  const { ship } = selected;
  const typeLabel = getShipTypeLabel(ship.shipType);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [ship.longitude, ship.latitude],
      zoom: FOCUS_ZOOM["ships"],
      duration: 1500,
    });
    map.once("moveend", () => resumeTracking());
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor="#3d7ab5">
        <div className="w-full h-[140px] bg-surface flex items-center justify-center">
          <ShipIcon size={48} strokeWidth={1.5} className="text-white" />
        </div>
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={ShipIcon}
          accentColor={CATEGORY_COLORS["Transportation"]}
          name={ship.name ? `${ship.name} (${typeLabel})` : `MMSI ${ship.mmsi}`}
          latitude={ship.latitude}
          longitude={ship.longitude}
          detail={`${elapsed}s ago`}
          onRecenter={recenter}
          tracking={tracking}
        />
        <CardSection title="Vessel Data">
          <CardGrid>
            <CardRow
              label="Speed"
              value={ship.speed != null ? `${ship.speed.toFixed(1)} kts` : "—"}
            />
            <CardRow
              label="Course"
              value={ship.course != null ? `${Math.round(ship.course)}°` : "—"}
            />
            <CardRow
              label="Heading"
              value={ship.heading != null ? `${Math.round(ship.heading)}°` : "—"}
            />
            <CardRow label="MMSI" value={`${ship.mmsi}`} />
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={ship.latitude} longitude={ship.longitude} />
        <CardSource name="AIS Vessel Data" url="https://www.marinetraffic.com" />
      </CardBody>
    </DetailCard>
  );
}
