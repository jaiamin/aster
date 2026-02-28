import { Mountain } from "lucide-react";
import { useMemo } from "react";

import { useVolcanoes } from "./use-volcanoes";
import { VolcanoSelectionProvider, useVolcanoSelection } from "./volcano-context";
import { VolcanoDetailCard } from "./volcano-detail-card";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { filterByTime } from "@/lib/time-filter";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useModuleFilter } from "@/modules/module-context";
import type { Volcano } from "@/types/volcanoes";

const MODULE_ID = "volcanoes";

function toGeoJSON(
  volcanoes: Volcano[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: volcanoes.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
      properties: {
        id: v.id,
        pinImage: v.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: !regionActive || inRegionSet.has(v.id),
      },
    })),
  };
}

function findItem(items: Volcano[], feature: maplibregl.GeoJSONFeature): Volcano | undefined {
  return items.find((v) => v.id === feature.properties?.id);
}

function VolcanoesLayerInner({
  volcanoes,
  inRegionSet,
  regionActive,
}: {
  volcanoes: Volcano[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useVolcanoSelection();
  const selectedId = selected?.volcano.id ?? null;

  return usePinLayer<Volcano>({
    moduleId: MODULE_ID,
    items: volcanoes,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Mountain,
    bgColor: CATEGORY_COLORS["Events"],
    clusterMaxZoom: 12,
    inRegionSet,
    regionActive,
  });
}

export function VolcanoesLayer() {
  const volcanoes = useVolcanoes();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => (volcanoes ? filterByTime(volcanoes, "volcanoes", timeFilter) : null),
    [volcanoes, timeFilter],
  );

  useModuleData("volcanoes", timeFiltered);

  const matchesFilters = useExplorerFilters("volcanoes");
  const filtered = useMemo(
    () => (timeFiltered ? timeFiltered.filter(matchesFilters) : null),
    [timeFiltered, matchesFilters],
  );

  useModuleCount("volcanoes", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (v) => v.id,
    (v) => v.longitude,
    (v) => v.latitude,
  );
  useRegionCount("volcanoes", regionCount);
  return (
    <VolcanoSelectionProvider>
      <VolcanoesLayerInner
        volcanoes={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <VolcanoDetailCard />
    </VolcanoSelectionProvider>
  );
}
