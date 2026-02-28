import { useMap } from "@vis.gl/react-maplibre";
import { Zap } from "lucide-react";
import { memo } from "react";

import { usePowerPlantSelection } from "./power-plant-context";

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

function fuelColor(fuel: string): string {
  switch (fuel) {
    case "Coal":
      return "#6b7280";
    case "Gas":
      return "#f59e0b";
    case "Oil":
      return "#78716c";
    case "Hydro":
      return "#3b82f6";
    case "Solar":
      return "#eab308";
    case "Wind":
      return "#06b6d4";
    case "Nuclear":
      return "#a855f7";
    case "Geothermal":
      return "#ef4444";
    case "Biomass":
      return "#22c55e";
    case "Waste":
      return "#a3a3a3";
    default:
      return "#6b7280";
  }
}

export const PowerPlantDetailCard = memo(function PowerPlantDetailCard() {
  const { selected, deselect } = usePowerPlantSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { plant } = selected;
  const color = fuelColor(plant.fuelType);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [plant.longitude, plant.latitude],
      zoom: FOCUS_ZOOM["power-plants"],
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={color}>
        <SpinningAerialBanner
          latitude={plant.latitude}
          longitude={plant.longitude}
          zoom={15}
          fallback={
            <div className="w-full h-[140px] flex items-center justify-center bg-surface">
              <Zap size={48} strokeWidth={1.5} className="text-white" />
            </div>
          }
        />
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Zap}
          accentColor={CATEGORY_COLORS["Infrastructure"]}
          name={plant.name}
          latitude={plant.latitude}
          longitude={plant.longitude}
          onRecenter={recenter}
        />
        <CardSection title="Plant Details">
          <CardGrid>
            <CardRow label="Fuel" value={plant.fuelType} />
            <CardRow label="Capacity" value={`${plant.capacityMw} MW`} />
            {plant.owner && <CardRow label="Owner" value={plant.owner} />}
            {plant.commissioningYear != null && (
              <CardRow label="Commissioned" value={String(plant.commissioningYear)} />
            )}
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={plant.latitude} longitude={plant.longitude} />
        <CardSource
          name="WRI Global Power Plant Database"
          url="https://datasets.wri.org/datasets/global-power-plant-database"
        />
      </CardBody>
    </DetailCard>
  );
});
