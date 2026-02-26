import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Anchor } from "lucide-react";
import { usePorts } from "./use-ports";
import { PortSelectionProvider, usePortSelection } from "./port-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { PortDetailCard } from "./port-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Port } from "@/types/ports";
const MODULE_ID = "ports";

function toGeoJSON(ports: Port[], selectedId: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ports.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id,
        pinImage: p.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
      },
    })),
  };
}

function PortsLayerInner({ ports }: { ports: Port[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = usePortSelection();
  const portsRef = useRef(ports);
  portsRef.current = ports;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.port.id ?? null;
  const geojson = useMemo(() => toGeoJSON(ports, selectedId), [ports, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: Anchor, bgColor: CATEGORY_COLORS.Transportation };
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
        const port = portsRef.current.find((p) => p.id === id);
        if (port) {
          select(port);
          map.flyTo({ center: [port.longitude, port.latitude], zoom: FOCUS_ZOOM["ports"], duration: 1500 });
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

export function PortsLayer() {
  const ports = usePorts();
  useModuleCount("ports", ports.length);
  return (
    <PortSelectionProvider>
      <PortsLayerInner ports={ports} />
      <PortDetailCard />
    </PortSelectionProvider>
  );
}
