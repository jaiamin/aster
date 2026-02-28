import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Mountain } from "lucide-react";
import { useVolcanoes } from "./use-volcanoes";
import { VolcanoSelectionProvider, useVolcanoSelection } from "./volcano-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useModuleFilter } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { useModuleData } from "@/hooks/use-module-data";
import { useExplorerFilters } from "@/modules/explorer-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { VolcanoDetailCard } from "./volcano-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Volcano } from "@/types/volcanoes";

const MODULE_ID = "volcanoes";

function toGeoJSON(volcanoes: Volcano[], selectedId: string | null, inRegionSet: Set<string | number>): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: volcanoes.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
      properties: {
        id: v.id,
        pinImage: v.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: inRegionSet.size === 0 || inRegionSet.has(v.id),
      },
    })),
  };
}

function VolcanoesLayerInner({ volcanoes, inRegionSet, regionActive }: { volcanoes: Volcano[]; inRegionSet: Set<string | number>; regionActive: boolean }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useVolcanoSelection();
  const selectFromExplorer = useCallback((item: unknown) => {
    const vol = item as Volcano;
    select(vol);
    const map = mapRef?.getMap();
    if (map && typeof vol.longitude === "number" && typeof vol.latitude === "number") {
      map.flyTo({ center: [vol.longitude, vol.latitude], zoom: FOCUS_ZOOM["volcanoes"], duration: 1500, padding: DETAIL_CARD_PADDING });
    }
  }, [select, mapRef]);
  useModuleSelect("volcanoes", selectFromExplorer);
  const volcanoesRef = useRef(volcanoes);
  volcanoesRef.current = volcanoes;

  const selectedId = selected?.volcano.id ?? null;
  const geojson = useMemo(() => toGeoJSON(volcanoes, selectedId, inRegionSet), [volcanoes, selectedId, inRegionSet]);

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
        map.flyTo({ center: [volcano.longitude, volcano.latitude], zoom: FOCUS_ZOOM["volcanoes"], duration: 1500, padding: DETAIL_CARD_PADDING });
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
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [], (v) => v.id, (v) => v.longitude, (v) => v.latitude,
  );
  useRegionCount("volcanoes", regionCount);
  return (
    <VolcanoSelectionProvider>
      <VolcanoesLayerInner volcanoes={filtered ?? []} inRegionSet={inRegionSet} regionActive={regionActive} />
      <VolcanoDetailCard />
    </VolcanoSelectionProvider>
  );
}
