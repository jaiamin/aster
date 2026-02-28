import { Wind } from "lucide-react";
import { useMemo } from "react";

import { AirQualitySelectionProvider, useAirQualitySelection } from "./air-quality-context";
import { AirQualityDetailCard } from "./air-quality-detail-card";
import { useAirQuality } from "./use-air-quality";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { filterByTime } from "@/lib/time-filter";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useModuleFilter } from "@/modules/module-context";
import type { AirQualityStation } from "@/types/air-quality";

const MODULE_ID = "air-quality";

const STATUS_VARIANTS = [
  { key: "good", dotColor: "#00e400" },
  { key: "moderate", dotColor: "#eab308" },
  { key: "unhealthy-sg", dotColor: "#ff7e00" },
  { key: "unhealthy", dotColor: "#ff0000" },
  { key: "hazardous", dotColor: "#8f3f97" },
];

function pm25ToStatusKey(pm25: number): string {
  if (pm25 > 150) return "hazardous";
  if (pm25 > 55) return "unhealthy";
  if (pm25 > 35) return "unhealthy-sg";
  if (pm25 > 12) return "moderate";
  return "good";
}

function toGeoJSON(
  stations: AirQualityStation[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => {
      const key = pm25ToStatusKey(s.pm25);
      const sel = s.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
        properties: {
          id: s.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
          inRegion: !regionActive || inRegionSet.has(s.id),
        },
      };
    }),
  };
}

function AirQualityLayerInner({
  stations,
  inRegionSet,
  regionActive,
}: {
  stations: AirQualityStation[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useAirQualitySelection();
  const selectedId = selected?.station.id ?? null;

  return usePinLayer<AirQualityStation>({
    moduleId: MODULE_ID,
    items: stations,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem: (items, feature) => items.find((s) => s.id === feature.properties?.id),
    icon: Wind,
    bgColor: CATEGORY_COLORS.Environment,
    statusVariants: STATUS_VARIANTS,
    clusterMaxZoom: 12,
    inRegionSet,
    regionActive,
  });
}

export function AirQualityLayer() {
  const stations = useAirQuality();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => (stations ? filterByTime(stations, "air-quality", timeFilter) : null),
    [stations, timeFilter],
  );

  useModuleData("air-quality", timeFiltered);

  const matchesFilters = useExplorerFilters("air-quality");
  const filtered = useMemo(
    () => (timeFiltered ? timeFiltered.filter(matchesFilters) : null),
    [timeFiltered, matchesFilters],
  );

  useModuleCount("air-quality", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (s) => s.id,
    (s) => s.longitude,
    (s) => s.latitude,
  );
  useRegionCount("air-quality", regionCount);
  return (
    <AirQualitySelectionProvider>
      <AirQualityLayerInner
        stations={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <AirQualityDetailCard />
    </AirQualitySelectionProvider>
  );
}
