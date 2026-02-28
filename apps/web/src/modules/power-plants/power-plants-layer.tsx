import { Zap } from "lucide-react";
import { useMemo } from "react";

import { PowerPlantSelectionProvider, usePowerPlantSelection } from "./power-plant-context";
import { PowerPlantDetailCard } from "./power-plant-detail-card";
import { usePowerPlants } from "./use-power-plants";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { useExplorerFilters } from "@/modules/explorer-context";
import type { PowerPlant } from "@/types/power-plants";

const MODULE_ID = "power-plants";

const STATUS_VARIANTS = [
  { key: "coal", dotColor: "#6b7280" },
  { key: "gas", dotColor: "#f59e0b" },
  { key: "oil", dotColor: "#78716c" },
  { key: "hydro", dotColor: "#3b82f6" },
  { key: "solar", dotColor: "#eab308" },
  { key: "wind", dotColor: "#06b6d4" },
  { key: "nuclear", dotColor: "#a855f7" },
  { key: "geothermal", dotColor: "#ef4444" },
  { key: "biomass", dotColor: "#22c55e" },
  { key: "waste", dotColor: "#a3a3a3" },
  { key: "other", dotColor: "#6b7280" },
];

function fuelToStatusKey(fuel: string): string {
  const key = fuel.toLowerCase();
  if (STATUS_VARIANTS.some((v) => v.key === key)) return key;
  return "other";
}

function toGeoJSON(
  plants: PowerPlant[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: plants.map((p) => {
      const key = fuelToStatusKey(p.fuelType);
      const sel = p.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
          inRegion: !regionActive || inRegionSet.has(p.id),
        },
      };
    }),
  };
}

function findItem(items: PowerPlant[], feature: maplibregl.GeoJSONFeature): PowerPlant | undefined {
  return items.find((p) => p.id === feature.properties?.id);
}

function PowerPlantsLayerInner({
  plants,
  inRegionSet,
  regionActive,
}: {
  plants: PowerPlant[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = usePowerPlantSelection();
  const selectedId = selected?.plant.id ?? null;

  return usePinLayer<PowerPlant>({
    moduleId: MODULE_ID,
    items: plants,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Zap,
    bgColor: CATEGORY_COLORS.Infrastructure,
    statusVariants: STATUS_VARIANTS,
    clusterMaxZoom: 12,
    inRegionSet,
    regionActive,
  });
}

export function PowerPlantsLayer() {
  const plants = usePowerPlants();

  useModuleData("power-plants", plants);

  const matchesFilters = useExplorerFilters("power-plants");
  const filtered = useMemo(
    () => (plants ? plants.filter(matchesFilters) : null),
    [plants, matchesFilters],
  );

  useModuleCount("power-plants", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (p) => p.id,
    (p) => p.longitude,
    (p) => p.latitude,
  );
  useRegionCount("power-plants", regionCount);
  return (
    <PowerPlantSelectionProvider>
      <PowerPlantsLayerInner
        plants={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <PowerPlantDetailCard />
    </PowerPlantSelectionProvider>
  );
}
