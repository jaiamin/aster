import { Radiation } from "lucide-react";
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
import { useNuclearSelection } from "./nuclear-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { CATEGORY_COLORS } from "@/lib/category-colors";

function statusColor(status: string): string {
  switch (status) {
    case "Operational": return "#00e400";
    case "Under Construction": return "#ffff00";
    case "Planned": return "#00bfff";
    case "Suspended Operation":
    case "Suspended Construction": return "#ff7e00";
    case "Shutdown":
    case "Decommissioning Completed":
    case "Cancelled Construction":
    case "Never Commissioned": return "#888888";
    default: return "#888888";
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function NuclearDetailCard() {
  const { selected, deselect } = useNuclearSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { facility } = selected;
  const color = statusColor(facility.status);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [facility.longitude, facility.latitude],
      zoom: FOCUS_ZOOM["nuclear"],
      duration: 1500,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={color}>
        <SpinningAerialBanner
          latitude={facility.latitude}
          longitude={facility.longitude}
          zoom={15}
          fallback={
            <div className="w-full h-[140px] flex items-center justify-center bg-surface">
              <Radiation size={48} strokeWidth={1.5} className="text-white" />
            </div>
          }
        />
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Radiation}
          accentColor={CATEGORY_COLORS["Infrastructure"]}
          name={facility.name}
          latitude={facility.latitude}
          longitude={facility.longitude}
          onRecenter={recenter}
        />
        <CardSection title="Reactor Details">
          <CardGrid>
            {facility.reactorType && (
              <CardRow label="Type" value={facility.reactorType} />
            )}
            {facility.reactorModel && (
              <CardRow label="Model" value={facility.reactorModel} />
            )}
            {facility.capacity != null && (
              <CardRow label="Capacity" value={`${facility.capacity} MW`} />
            )}
            <CardRow label="Status" value={facility.status} />
          </CardGrid>
        </CardSection>
        <CardSection title="Timeline">
          <CardGrid>
            <CardRow label="Operational" value={formatDate(facility.operationalFrom)} />
            {facility.operationalTo && (
              <CardRow label="Shutdown" value={formatDate(facility.operationalTo)} />
            )}
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={facility.latitude} longitude={facility.longitude} />
        <CardSource name="IAEA PRIS" url="https://pris.iaea.org" />
      </CardBody>
    </DetailCard>
  );
}
