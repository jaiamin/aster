import { Rocket } from "lucide-react";
import { useMemo } from "react";

import { LaunchSelectionProvider, useLaunchSelection } from "./launch-context";
import { LaunchDetailCard } from "./launch-detail-card";
import { useLaunches } from "./use-launches";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { filterByTime } from "@/lib/time-filter";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useModuleFilter } from "@/modules/module-context";
import type { Launch } from "@/types/launches";

const MODULE_ID = "launches";

const STATUS_VARIANTS = [
  { key: "go", dotColor: "#22c55e" },
  { key: "success", dotColor: "#3b82f6" },
  { key: "fail", dotColor: "#ef4444" },
];

function statusToKey(status: string): string {
  if (status === "Success") return "success";
  if (status === "Failure" || status === "Partial Failure") return "fail";
  return "go";
}

function toGeoJSON(
  launches: Launch[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  const sites = new Map<string, Launch[]>();
  for (const l of launches) {
    const coordKey = `${l.longitude},${l.latitude}`;
    const group = sites.get(coordKey);
    if (group) group.push(l);
    else sites.set(coordKey, [l]);
  }

  return {
    type: "FeatureCollection",
    features: Array.from(sites.values()).map((group) => {
      const first = group[0];
      const sel = group.some((l) => l.id === selectedId);
      const key = statusToKey(first.status);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [first.longitude, first.latitude] },
        properties: {
          id: first.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
          inRegion: !regionActive || inRegionSet.has(first.id),
        },
      };
    }),
  };
}

function findItem(items: Launch[], feature: maplibregl.GeoJSONFeature): Launch | undefined {
  return items.find((l) => l.id === feature.properties?.id);
}

function LaunchesLayerInner({
  launches,
  inRegionSet,
  regionActive,
}: {
  launches: Launch[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useLaunchSelection();
  const selectedId = selected?.launch.id ?? null;

  return usePinLayer<Launch>({
    moduleId: MODULE_ID,
    items: launches,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Rocket,
    bgColor: CATEGORY_COLORS.Events,
    statusVariants: STATUS_VARIANTS,
    clusterMaxZoom: 8,
    inRegionSet,
    regionActive,
  });
}

export function LaunchesLayer() {
  const launches = useLaunches();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => (launches ? filterByTime(launches, "launches", timeFilter) : null),
    [launches, timeFilter],
  );

  useModuleData("launches", timeFiltered);

  const matchesFilters = useExplorerFilters("launches");
  const filtered = useMemo(
    () => (timeFiltered ? timeFiltered.filter(matchesFilters) : null),
    [timeFiltered, matchesFilters],
  );

  useModuleCount("launches", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (l) => l.id,
    (l) => l.longitude,
    (l) => l.latitude,
  );
  useRegionCount("launches", regionCount);
  return (
    <LaunchSelectionProvider>
      <LaunchesLayerInner
        launches={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <LaunchDetailCard />
    </LaunchSelectionProvider>
  );
}
