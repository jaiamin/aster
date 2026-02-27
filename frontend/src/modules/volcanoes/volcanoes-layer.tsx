import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Mountain } from "lucide-react";
import { useVolcanoes } from "./use-volcanoes";
import { VolcanoSelectionProvider, useVolcanoSelection } from "./volcano-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useModuleFilter, useRegion } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { useModuleData } from "@/hooks/use-module-data";
import { useExplorerFilters } from "@/modules/explorer-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { VolcanoDetailCard } from "./volcano-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Volcano } from "@/types/volcanoes";

const MODULE_ID = "volcanoes";

function toGeoJSON(volcanoes: Volcano[], selectedId: string | null, isInRegion: (lng: number, lat: number) => boolean): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: volcanoes.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
      properties: {
        id: v.id,
        pinImage: v.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: isInRegion(v.longitude, v.latitude),
      },
    })),
  };
}

function VolcanoesLayerInner({ volcanoes }: { volcanoes: Volcano[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useVolcanoSelection();
  const volcanoesRef = useRef(volcanoes);
  volcanoesRef.current = volcanoes;

  const { isInRegion, regionActive } = useRegion();
  const selectedId = selected?.volcano.id ?? null;
  const geojson = useMemo(() => toGeoJSON(volcanoes, selectedId, isInRegion), [volcanoes, selectedId, isInRegion]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Mountain, bgColor: CATEGORY_COLORS["Events"] });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const volcano = volcanoesRef.current.find((v) => v.id === id);
      if (volcano) {
        select(volcano);
        map.flyTo({ center: [volcano.longitude, volcano.latitude], zoom: FOCUS_ZOOM["volcanoes"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} regionActive={regionActive} />;
}

export function VolcanoesLayer() {
  const volcanoes = useVolcanoes();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => volcanoes ? filterByTime(volcanoes, "volcanoes", timeFilter) : null,
    [volcanoes, timeFilter],
  );

  useModuleData("volcanoes", timeFiltered);

  const matchesFilters = useExplorerFilters("volcanoes");
  const filtered = useMemo(
    () => timeFiltered ? timeFiltered.filter(matchesFilters) : null,
    [timeFiltered, matchesFilters],
  );

  useModuleCount("volcanoes", filtered?.length ?? null);
  const { isInRegion, regionActive } = useRegion();
  const regionCount = useMemo(() => {
    if (!filtered || !regionActive) return null;
    return filtered.filter((v) => isInRegion(v.longitude, v.latitude)).length;
  }, [filtered, regionActive, isInRegion]);
  useRegionCount("volcanoes", regionCount);
  return (
    <VolcanoSelectionProvider>
      <VolcanoesLayerInner volcanoes={filtered ?? []} />
      <VolcanoDetailCard />
    </VolcanoSelectionProvider>
  );
}
