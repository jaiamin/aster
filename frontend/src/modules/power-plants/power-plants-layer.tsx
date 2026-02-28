import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Zap } from "lucide-react";
import { usePowerPlants } from "./use-power-plants";
import { PowerPlantSelectionProvider, usePowerPlantSelection } from "./power-plant-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { useRegionCount } from "@/hooks/use-region-count";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { PowerPlantDetailCard } from "./power-plant-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
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

function toGeoJSON(plants: PowerPlant[], selectedId: string | null, inRegionSet: Set<string | number>, regionActive: boolean): GeoJSON.FeatureCollection {
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

function PowerPlantsLayerInner({ plants, inRegionSet, regionActive }: { plants: PowerPlant[]; inRegionSet: Set<string | number>; regionActive: boolean }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = usePowerPlantSelection();
  const selectFromExplorer = useCallback((item: unknown) => {
    const plant = item as PowerPlant;
    select(plant);
    const map = mapRef?.getMap();
    if (map && typeof plant.longitude === "number" && typeof plant.latitude === "number") {
      map.flyTo({ center: [plant.longitude, plant.latitude], zoom: FOCUS_ZOOM["power-plants"], duration: 1500, padding: DETAIL_CARD_PADDING });
    }
  }, [select, mapRef]);
  useModuleSelect("power-plants", selectFromExplorer);
  const plantsRef = useRef(plants);
  plantsRef.current = plants;

  const selectedId = selected?.plant.id ?? null;
  const geojson = useMemo(() => toGeoJSON(plants, selectedId, inRegionSet, regionActive), [plants, selectedId, inRegionSet, regionActive]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Zap, bgColor: CATEGORY_COLORS.Infrastructure, statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const plant = plantsRef.current.find((p) => p.id === id);
      if (plant) {
        select(plant);
        map.flyTo({
          center: [plant.longitude, plant.latitude],
          zoom: FOCUS_ZOOM["power-plants"],
          duration: 1500,
          padding: DETAIL_CARD_PADDING,
        });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} regionActive={regionActive} />;
}

export function PowerPlantsLayer() {
  const plants = usePowerPlants();

  useModuleData("power-plants", plants);

  const matchesFilters = useExplorerFilters("power-plants");
  const filtered = useMemo(
    () => plants ? plants.filter(matchesFilters) : null,
    [plants, matchesFilters],
  );

  useModuleCount("power-plants", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [], (p) => p.id, (p) => p.longitude, (p) => p.latitude,
  );
  useRegionCount("power-plants", regionCount);
  return (
    <PowerPlantSelectionProvider>
      <PowerPlantsLayerInner plants={filtered ?? []} inRegionSet={inRegionSet} regionActive={regionActive} />
      <PowerPlantDetailCard />
    </PowerPlantSelectionProvider>
  );
}
