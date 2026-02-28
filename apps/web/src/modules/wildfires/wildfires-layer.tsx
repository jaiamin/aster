import { Flame } from "lucide-react";
import { useMemo } from "react";

import { useWildfires } from "./use-wildfires";
import { WildfireSelectionProvider, useWildfireSelection } from "./wildfire-context";
import { WildfireDetailCard } from "./wildfire-detail-card";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { filterByTime } from "@/lib/time-filter";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useModuleFilter } from "@/modules/module-context";
import type { Wildfire } from "@/types/wildfires";

const MODULE_ID = "wildfires";

const STATUS_VARIANTS = [
  { key: "orange", dotColor: "#ff9800" },
  { key: "red", dotColor: "#ff5722" },
  { key: "extreme", dotColor: "#f44336" },
];

function frpToStatusKey(frp: number): string {
  if (frp >= 200) return "extreme";
  if (frp >= 20) return "red";
  return "orange";
}

function toGeoJSON(
  fires: Wildfire[],
  selectedIdx: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fires.map((f, i) => {
      const key = frpToStatusKey(f.frp);
      const sel = i === selectedIdx;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
        properties: {
          idx: i,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
          inRegion: !regionActive || inRegionSet.has(i),
        },
      };
    }),
  };
}

function findItem(items: Wildfire[], feature: maplibregl.GeoJSONFeature): Wildfire | undefined {
  return items[feature.properties?.idx];
}

function WildfiresLayerInner({
  fires,
  inRegionSet,
  regionActive,
}: {
  fires: Wildfire[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useWildfireSelection();

  const selectedIdx = selected
    ? fires.findIndex(
        (f) =>
          f.latitude === selected.fire.latitude &&
          f.longitude === selected.fire.longitude &&
          f.frp === selected.fire.frp,
      )
    : null;

  return usePinLayer<Wildfire>({
    moduleId: MODULE_ID,
    items: fires,
    selectedId: selectedIdx,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Flame,
    bgColor: CATEGORY_COLORS["Events"],
    statusVariants: STATUS_VARIANTS,
    clusterMaxZoom: 12,
    inRegionSet,
    regionActive,
  });
}

export function WildfiresLayer() {
  const fires = useWildfires();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => (fires ? filterByTime(fires, "wildfires", timeFilter) : null),
    [fires, timeFilter],
  );

  useModuleData("wildfires", timeFiltered);

  const matchesFilters = useExplorerFilters("wildfires");
  const filtered = useMemo(
    () => (timeFiltered ? timeFiltered.filter(matchesFilters) : null),
    [timeFiltered, matchesFilters],
  );

  useModuleCount("wildfires", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (_f: Wildfire, i: number) => i,
    (f: Wildfire) => f.longitude,
    (f: Wildfire) => f.latitude,
  );
  useRegionCount("wildfires", regionCount);
  return (
    <WildfireSelectionProvider>
      <WildfiresLayerInner
        fires={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <WildfireDetailCard />
    </WildfireSelectionProvider>
  );
}
