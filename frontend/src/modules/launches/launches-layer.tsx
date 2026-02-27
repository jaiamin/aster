import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Rocket } from "lucide-react";
import { useLaunches } from "./use-launches";
import { LaunchSelectionProvider, useLaunchSelection } from "./launch-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useModuleFilter, useRegion } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { useModuleData } from "@/hooks/use-module-data";
import { useExplorerFilters } from "@/modules/explorer-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { LaunchDetailCard } from "./launch-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
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

function toGeoJSON(launches: Launch[], selectedId: string | null, isInRegion: (lng: number, lat: number) => boolean): GeoJSON.FeatureCollection {
  // Group launches by pad coordinates so each site = one pin
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
          inRegion: isInRegion(first.longitude, first.latitude),
        },
      };
    }),
  };
}

function LaunchesLayerInner({ launches }: { launches: Launch[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useLaunchSelection();
  const selectFromExplorer = useCallback((item: any) => {
    select(item);
    const map = mapRef?.getMap();
    if (map && typeof item.longitude === "number" && typeof item.latitude === "number") {
      map.flyTo({ center: [item.longitude, item.latitude], zoom: FOCUS_ZOOM["launches"], duration: 1500 });
    }
  }, [select, mapRef]);
  useModuleSelect("launches", selectFromExplorer);
  const launchesRef = useRef(launches);
  launchesRef.current = launches;

  const { isInRegion, regionActive } = useRegion();
  const selectedId = selected?.launch.id ?? null;
  const geojson = useMemo(() => toGeoJSON(launches, selectedId, isInRegion), [launches, selectedId, isInRegion]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Rocket, bgColor: CATEGORY_COLORS.Events, statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const launch = launchesRef.current.find((l) => l.id === id);
      if (launch) {
        select(launch);
        map.flyTo({ center: [launch.longitude, launch.latitude], zoom: FOCUS_ZOOM["launches"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={8} regionActive={regionActive} />;
}

export function LaunchesLayer() {
  const launches = useLaunches();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => launches ? filterByTime(launches, "launches", timeFilter) : null,
    [launches, timeFilter],
  );

  useModuleData("launches", timeFiltered);

  const matchesFilters = useExplorerFilters("launches");
  const filtered = useMemo(
    () => timeFiltered ? timeFiltered.filter(matchesFilters) : null,
    [timeFiltered, matchesFilters],
  );

  useModuleCount("launches", filtered?.length ?? null);
  const { isInRegion, regionActive } = useRegion();
  const regionCount = useMemo(() => {
    if (!filtered || !regionActive) return null;
    return filtered.filter((l) => isInRegion(l.longitude, l.latitude)).length;
  }, [filtered, regionActive, isInRegion]);
  useRegionCount("launches", regionCount);
  return (
    <LaunchSelectionProvider>
      <LaunchesLayerInner launches={filtered ?? []} />
      <LaunchDetailCard />
    </LaunchSelectionProvider>
  );
}
