import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { PlaneTakeoff } from "lucide-react";
import { useAirports } from "./use-airports";
import { AirportSelectionProvider, useAirportSelection } from "./airport-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { useRegionCount } from "@/hooks/use-region-count";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useRegion } from "@/modules/module-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { AirportDetailCard } from "./airport-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Airport } from "@/types/airports";

const MODULE_ID = "airports";

function toGeoJSON(airports: Airport[], selectedId: string | null, isInRegion: (lng: number, lat: number) => boolean): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: airports.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: {
        id: a.id,
        pinImage: a.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: isInRegion(a.longitude, a.latitude),
      },
    })),
  };
}

function AirportsLayerInner({ airports }: { airports: Airport[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useAirportSelection();
  const selectFromExplorer = useCallback((item: any) => {
    select(item);
    const map = mapRef?.getMap();
    if (map && typeof item.longitude === "number" && typeof item.latitude === "number") {
      map.flyTo({ center: [item.longitude, item.latitude], zoom: FOCUS_ZOOM["airports"], duration: 1500 });
    }
  }, [select, mapRef]);
  useModuleSelect("airports", selectFromExplorer);
  const { isInRegion, regionActive } = useRegion();
  const airportsRef = useRef(airports);
  airportsRef.current = airports;

  const selectedId = selected?.airport.id ?? null;
  const geojson = useMemo(() => toGeoJSON(airports, selectedId, isInRegion), [airports, selectedId, isInRegion]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: PlaneTakeoff, bgColor: CATEGORY_COLORS.Infrastructure });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const airport = airportsRef.current.find((a) => a.id === id);
      if (airport) {
        select(airport);
        map.flyTo({ center: [airport.longitude, airport.latitude], zoom: FOCUS_ZOOM["airports"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} regionActive={regionActive} />;
}

export function AirportsLayer() {
  const airports = useAirports();

  useModuleData("airports", airports);

  const matchesFilters = useExplorerFilters("airports");
  const filtered = useMemo(
    () => airports ? airports.filter(matchesFilters) : null,
    [airports, matchesFilters],
  );

  useModuleCount("airports", filtered?.length ?? null);
  const { isInRegion, regionActive } = useRegion();
  const regionCount = useMemo(() => {
    if (!filtered || !regionActive) return null;
    return filtered.filter((a) => isInRegion(a.longitude, a.latitude)).length;
  }, [filtered, regionActive, isInRegion]);
  useRegionCount("airports", regionCount);
  return (
    <AirportSelectionProvider>
      <AirportsLayerInner airports={filtered ?? []} />
      <AirportDetailCard />
    </AirportSelectionProvider>
  );
}
