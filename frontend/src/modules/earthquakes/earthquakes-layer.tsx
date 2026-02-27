import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Activity } from "lucide-react";
import { useEarthquakes } from "./use-earthquakes";
import { EarthquakeSelectionProvider, useEarthquakeSelection } from "./earthquake-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useModuleFilter, useRegion } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { useModuleData } from "@/hooks/use-module-data";
import { useExplorerFilters } from "@/modules/explorer-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { EarthquakeDetailCard } from "./earthquake-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
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

function toGeoJSON(quakes: Earthquake[], selectedId: string | null, isInRegion: (lng: number, lat: number) => boolean): GeoJSON.FeatureCollection {
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
          inRegion: isInRegion(q.longitude, q.latitude),
        },
      };
    }),
  };
}

function EarthquakesLayerInner({ quakes }: { quakes: Earthquake[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useEarthquakeSelection();
  const selectFromExplorer = useCallback((item: any) => {
    select(item);
    const map = mapRef?.getMap();
    if (map && typeof item.longitude === "number" && typeof item.latitude === "number") {
      map.flyTo({ center: [item.longitude, item.latitude], zoom: FOCUS_ZOOM["earthquakes"], duration: 1500, padding: DETAIL_CARD_PADDING });
    }
  }, [select, mapRef]);
  useModuleSelect(MODULE_ID, selectFromExplorer);
  const quakesRef = useRef(quakes);
  quakesRef.current = quakes;

  const { isInRegion, regionActive } = useRegion();
  const selectedId = selected?.quake.id ?? null;
  const geojson = useMemo(() => toGeoJSON(quakes, selectedId, isInRegion), [quakes, selectedId, isInRegion]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Activity, bgColor: CATEGORY_COLORS["Events"], statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const quake = quakesRef.current.find((q) => q.id === id);
      if (quake) {
        select(quake);
        map.flyTo({ center: [quake.longitude, quake.latitude], zoom: FOCUS_ZOOM["earthquakes"], duration: 1500, padding: DETAIL_CARD_PADDING });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} regionActive={regionActive} />;
}

export function EarthquakesLayer() {
  const quakes = useEarthquakes();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => quakes ? filterByTime(quakes, "earthquakes", timeFilter) : null,
    [quakes, timeFilter],
  );

  useModuleData("earthquakes", timeFiltered);

  const matchesFilters = useExplorerFilters("earthquakes");
  const filtered = useMemo(
    () => timeFiltered ? timeFiltered.filter(matchesFilters) : null,
    [timeFiltered, matchesFilters],
  );

  useModuleCount("earthquakes", filtered?.length ?? null);
  const { isInRegion, regionActive } = useRegion();
  const regionCount = useMemo(() => {
    if (!filtered || !regionActive) return null;
    return filtered.filter((q) => isInRegion(q.longitude, q.latitude)).length;
  }, [filtered, regionActive, isInRegion]);
  useRegionCount("earthquakes", regionCount);
  return (
    <EarthquakeSelectionProvider>
      <EarthquakesLayerInner quakes={filtered ?? []} />
      <EarthquakeDetailCard />
    </EarthquakeSelectionProvider>
  );
}
