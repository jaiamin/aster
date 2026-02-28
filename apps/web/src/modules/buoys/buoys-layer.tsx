import { Navigation } from "lucide-react";
import { useMemo } from "react";

import { BuoySelectionProvider, useBuoySelection } from "./buoy-context";
import { BuoyDetailCard } from "./buoy-detail-card";
import { useBuoys } from "./use-buoys";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { filterByTime } from "@/lib/time-filter";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useModuleFilter } from "@/modules/module-context";
import type { Buoy } from "@/types/buoys";

const MODULE_ID = "buoys";

function toGeoJSON(
  buoys: Buoy[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: buoys.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
      properties: {
        id: b.id,
        pinImage: b.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: !regionActive || inRegionSet.has(b.id),
      },
    })),
  };
}

function findItem(items: Buoy[], feature: maplibregl.GeoJSONFeature): Buoy | undefined {
  return items.find((b) => b.id === feature.properties?.id);
}

function BuoysLayerInner({
  buoys,
  inRegionSet,
  regionActive,
}: {
  buoys: Buoy[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useBuoySelection();
  const selectedId = selected?.buoy.id ?? null;

  return usePinLayer<Buoy>({
    moduleId: MODULE_ID,
    items: buoys,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Navigation,
    bgColor: CATEGORY_COLORS.Environment,
    clusterMaxZoom: 10,
    inRegionSet,
    regionActive,
  });
}

export function BuoysLayer() {
  const buoys = useBuoys();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => (buoys ? filterByTime(buoys, "buoys", timeFilter) : null),
    [buoys, timeFilter],
  );

  useModuleData("buoys", timeFiltered);

  const matchesFilters = useExplorerFilters("buoys");
  const filtered = useMemo(
    () => (timeFiltered ? timeFiltered.filter(matchesFilters) : null),
    [timeFiltered, matchesFilters],
  );

  useModuleCount("buoys", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (b) => b.id,
    (b) => b.longitude,
    (b) => b.latitude,
  );
  useRegionCount("buoys", regionCount);
  return (
    <BuoySelectionProvider>
      <BuoysLayerInner
        buoys={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <BuoyDetailCard />
    </BuoySelectionProvider>
  );
}
