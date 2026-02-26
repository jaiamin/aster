import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Mountain } from "lucide-react";
import { useVolcanoes } from "./use-volcanoes";
import { VolcanoSelectionProvider, useVolcanoSelection } from "./volcano-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { VolcanoDetailCard } from "./volcano-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
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
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.volcano.id ?? null;
  const geojson = useMemo(() => toGeoJSON(volcanoes, selectedId), [volcanoes, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: Mountain, bgColor: CATEGORY_COLORS["Natural Events"] };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;
      const features = map.queryRenderedFeatures(e.point, { layers: [`${MODULE_ID}-pins`] });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const volcano = volcanoesRef.current.find((v) => v.id === id);
        if (volcano) {
          select(volcano);
          map.flyTo({ center: [volcano.longitude, volcano.latitude], zoom: FOCUS_ZOOM["volcanoes"], duration: 1500 });
        }
      } else if (selectedRef.current && !consumed) {
        deselect();
      }
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, select, deselect]);

  // Pointer cursor
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.on("mouseenter", `${MODULE_ID}-pins`, onEnter);
    map.on("mouseleave", `${MODULE_ID}-pins`, onLeave);
    return () => {
      map.off("mouseenter", `${MODULE_ID}-pins`, onEnter);
      map.off("mouseleave", `${MODULE_ID}-pins`, onLeave);
    };
  }, [mapRef]);

  if (!ready) return null;

  return (
    <Source id={`${MODULE_ID}-source`} type="geojson" data={geojson}>
      <Layer
        id={`${MODULE_ID}-pins`}
        type="symbol"
        layout={{
          "icon-image": ["get", "pinImage"],
          "icon-size": 1,
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
      />
    </Source>
  );
}

export function VolcanoesLayer() {
  const volcanoes = useVolcanoes();
  useModuleCount("volcanoes", volcanoes.length);
  return (
    <VolcanoSelectionProvider>
      <VolcanoesLayerInner volcanoes={volcanoes} />
      <VolcanoDetailCard />
    </VolcanoSelectionProvider>
  );
}
