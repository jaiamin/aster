import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Flame } from "lucide-react";
import { useWildfires } from "./use-wildfires";
import { WildfireSelectionProvider, useWildfireSelection } from "./wildfire-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { WildfireDetailCard } from "./wildfire-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Wildfire } from "@/types/wildfires";
const MODULE_ID = "wildfires";

const STATUS_VARIANTS = [
  { key: "orange", dotColor: "#ff9800" },
  { key: "red", dotColor: "#ff5722" },
  { key: "extreme", dotColor: "#f44336" },
];

function frpToStatusKey(frp: number): string {
  if (frp >= 200) return "extreme";
  if (frp >= 20) return "red";
  return "orange";
}

function toGeoJSON(fires: Wildfire[], selectedIdx: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fires.map((f, i) => {
      const key = frpToStatusKey(f.frp);
      const sel = i === selectedIdx;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
        properties: {
          idx: i,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function WildfiresLayerInner({ fires }: { fires: Wildfire[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useWildfireSelection();
  const firesRef = useRef(fires);
  firesRef.current = fires;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedIdx = selected
    ? fires.findIndex(
        (f) =>
          f.latitude === selected.fire.latitude &&
          f.longitude === selected.fire.longitude &&
          f.frp === selected.fire.frp,
      )
    : null;

  const geojson = useMemo(() => toGeoJSON(fires, selectedIdx), [fires, selectedIdx]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: Flame, bgColor: CATEGORY_COLORS["Natural Events"], statusVariants: STATUS_VARIANTS };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler — selection via centralized dispatcher
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const idx = feature.properties?.idx;
      const fire = firesRef.current[idx];
      if (fire) {
        select(fire);
        map.flyTo({ center: [fire.longitude, fire.latitude], zoom: FOCUS_ZOOM["wildfires"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  // Deselect on empty click
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!(e.originalEvent as any)._layerHandled && selectedRef.current) deselect();
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, deselect]);

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

export function WildfiresLayer() {
  const fires = useWildfires();
  useModuleCount("wildfires", fires?.length ?? null);
  return (
    <WildfireSelectionProvider>
      <WildfiresLayerInner fires={fires ?? []} />
      <WildfireDetailCard />
    </WildfireSelectionProvider>
  );
}
