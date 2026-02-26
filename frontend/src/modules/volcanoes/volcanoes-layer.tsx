import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Mountain } from "lucide-react";
import { useVolcanoes } from "./use-volcanoes";
import { VolcanoSelectionProvider, useVolcanoSelection } from "./volcano-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModules } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { VolcanoDetailCard } from "./volcano-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Volcano } from "@/types/volcanoes";

const MODULE_ID = "volcanoes";

function toGeoJSON(volcanoes: Volcano[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: volcanoes.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
      properties: {
        id: v.id,
        pinImage: v.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
      },
    })),
  };
}

function VolcanoesLayerInner({ volcanoes }: { volcanoes: Volcano[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useVolcanoSelection();
  const volcanoesRef = useRef(volcanoes);
  volcanoesRef.current = volcanoes;

  const selectedId = selected?.volcano.id ?? null;
  const geojson = useMemo(() => toGeoJSON(volcanoes, selectedId), [volcanoes, selectedId]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Mountain, bgColor: CATEGORY_COLORS["Natural Events"] });
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

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} />;
}

export function VolcanoesLayer() {
  const volcanoes = useVolcanoes();
  const { timeFilter } = useModules();
  const filtered = useMemo(
    () => volcanoes ? filterByTime(volcanoes, "volcanoes", timeFilter) : null,
    [volcanoes, timeFilter],
  );
  useModuleCount("volcanoes", filtered?.length ?? null);
  return (
    <VolcanoSelectionProvider>
      <VolcanoesLayerInner volcanoes={filtered ?? []} />
      <VolcanoDetailCard />
    </VolcanoSelectionProvider>
  );
}
