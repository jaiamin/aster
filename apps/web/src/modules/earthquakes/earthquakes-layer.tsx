import { Activity } from "lucide-react";
import { useMemo } from "react";

import { EarthquakeSelectionProvider, useEarthquakeSelection } from "./earthquake-context";
import { EarthquakeDetailCard } from "./earthquake-detail-card";
import { useEarthquakes } from "./use-earthquakes";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { filterByTime } from "@/lib/time-filter";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useModuleFilter } from "@/modules/module-context";
import type { Earthquake } from "@/types/earthquakes";

const MODULE_ID = "earthquakes";

const STATUS_VARIANTS = [
  { key: "green", dotColor: "#22c55e" },
  { key: "yellow", dotColor: "#eab308" },
  { key: "orange", dotColor: "#f97316" },
  { key: "red", dotColor: "#ef4444" },
];

function magToStatusKey(mag: number): string {
  if (mag >= 7.0) return "red";
  if (mag >= 5.5) return "orange";
  if (mag >= 4.0) return "yellow";
  return "green";
}

function toGeoJSON(
  quakes: Earthquake[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: quakes.map((q) => {
      const key = magToStatusKey(q.magnitude);
      const sel = q.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [q.longitude, q.latitude] },
        properties: {
          id: q.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
          inRegion: !regionActive || inRegionSet.has(q.id),
        },
      };
    }),
  };
}

function findItem(items: Earthquake[], feature: maplibregl.GeoJSONFeature): Earthquake | undefined {
  return items.find((q) => q.id === feature.properties?.id);
}

function EarthquakesLayerInner({
  quakes,
  inRegionSet,
  regionActive,
}: {
  quakes: Earthquake[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useEarthquakeSelection();
  const selectedId = selected?.quake.id ?? null;

  return usePinLayer<Earthquake>({
    moduleId: MODULE_ID,
    items: quakes,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Activity,
    bgColor: CATEGORY_COLORS["Events"],
    statusVariants: STATUS_VARIANTS,
    clusterMaxZoom: 12,
    inRegionSet,
    regionActive,
  });
}

export function EarthquakesLayer() {
  const quakes = useEarthquakes();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => (quakes ? filterByTime(quakes, "earthquakes", timeFilter) : null),
    [quakes, timeFilter],
  );

  useModuleData("earthquakes", timeFiltered);

  const matchesFilters = useExplorerFilters("earthquakes");
  const filtered = useMemo(
    () => (timeFiltered ? timeFiltered.filter(matchesFilters) : null),
    [timeFiltered, matchesFilters],
  );

  useModuleCount("earthquakes", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (q) => q.id,
    (q) => q.longitude,
    (q) => q.latitude,
  );
  useRegionCount("earthquakes", regionCount);
  return (
    <EarthquakeSelectionProvider>
      <EarthquakesLayerInner
        quakes={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <EarthquakeDetailCard />
    </EarthquakeSelectionProvider>
  );
}
