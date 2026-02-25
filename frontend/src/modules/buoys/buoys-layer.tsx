import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Navigation } from "lucide-react";
import { useBuoys } from "./use-buoys";
import { BuoySelectionProvider, useBuoySelection } from "./buoy-context";
import { BuoyDetailCard } from "./buoy-detail-card";
import { registerModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Buoy } from "@/types/buoys";
const MODULE_ID = "buoys";

function toGeoJSON(buoys: Buoy[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: buoys.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
      properties: {
        id: b.id,
        pinImage: b.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
      },
    })),
  };
}

function BuoysLayerInner({ buoys }: { buoys: Buoy[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useBuoySelection();
  const buoysRef = useRef(buoys);
  buoysRef.current = buoys;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.buoy.id ?? null;
  const geojson = useMemo(() => toGeoJSON(buoys, selectedId), [buoys, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    registerModulePins(map, {
      moduleId: MODULE_ID,
      icon: Navigation,
      bgColor: CATEGORY_COLORS.Environment,
    }).then(() => setReady(true));
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
        const buoy = buoysRef.current.find((b) => b.id === id);
        if (buoy) {
          select(buoy);
          map.flyTo({ center: [buoy.longitude, buoy.latitude], zoom: FOCUS_ZOOM["buoys"], duration: 1500 });
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

export function BuoysLayer() {
  const buoys = useBuoys();
  return (
    <BuoySelectionProvider>
      <BuoysLayerInner buoys={buoys} />
      <BuoyDetailCard />
    </BuoySelectionProvider>
  );
}
