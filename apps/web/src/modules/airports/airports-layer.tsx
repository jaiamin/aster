import { PlaneTakeoff } from "lucide-react";
import { useMemo } from "react";

import { AirportSelectionProvider, useAirportSelection } from "./airport-context";
import { AirportDetailCard } from "./airport-detail-card";
import { useAirports } from "./use-airports";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { useExplorerFilters } from "@/modules/explorer-context";
import type { Airport } from "@/types/airports";

const MODULE_ID = "airports";

function toGeoJSON(
  airports: Airport[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: airports.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: {
        id: a.id,
        pinImage: a.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: !regionActive || inRegionSet.has(a.id),
      },
    })),
  };
}

function findItem(items: Airport[], feature: maplibregl.GeoJSONFeature) {
  return items.find((a) => a.id === feature.properties?.id);
}

function AirportsLayerInner({
  airports,
  inRegionSet,
  regionActive,
}: {
  airports: Airport[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useAirportSelection();
  const selectedId = selected?.airport.id ?? null;

  return usePinLayer<Airport>({
    moduleId: MODULE_ID,
    items: airports,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: PlaneTakeoff,
    bgColor: CATEGORY_COLORS.Infrastructure,
    inRegionSet,
    regionActive,
  });
}

export function AirportsLayer() {
  const airports = useAirports();

  useModuleData("airports", airports);

  const matchesFilters = useExplorerFilters("airports");
  const filtered = useMemo(
    () => (airports ? airports.filter(matchesFilters) : null),
    [airports, matchesFilters],
  );

  useModuleCount("airports", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (a) => a.id,
    (a) => a.longitude,
    (a) => a.latitude,
  );
  useRegionCount("airports", regionCount);
  return (
    <AirportSelectionProvider>
      <AirportsLayerInner
        airports={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <AirportDetailCard />
    </AirportSelectionProvider>
  );
}
