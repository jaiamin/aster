import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { usePorts } from "./use-ports";
import { PortSelectionProvider, usePortSelection } from "./port-context";
import { PortDetailCard } from "./port-detail-card";
import type { Port } from "@/types/ports";

const PORT_COLOR = "#38bdf8";
const FOCUS_ZOOM = 12;

function toGeoJSON(ports: Port[], selectedId: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ports.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id,
        selected: p.id === selectedId,
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

  const selectedId = selected?.port.id ?? null;
  const geojson = useMemo(() => toGeoJSON(ports, selectedId), [ports, selectedId]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["ports-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const port = portsRef.current.find((p) => p.id === id);
        if (port) {
          select(port);
          map.flyTo({
            center: [port.longitude, port.latitude],
            zoom: FOCUS_ZOOM,
            duration: 1500,
          });
        }
      } else if (selectedRef.current && !consumed) {
        deselect();
      }
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, select, deselect]);

  // Pointer cursor on hover
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

    map.on("mouseenter", "ports-core", onEnter);
    map.on("mouseleave", "ports-core", onLeave);
    return () => {
      map.off("mouseenter", "ports-core", onEnter);
      map.off("mouseleave", "ports-core", onLeave);
    };
  }, [mapRef]);

  return (
    <Source id="ports-source" type="geojson" data={geojson}>
      {/* Glow */}
      <Layer
        id="ports-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 3,
            6, 6,
            10, 12,
          ],
          "circle-color": PORT_COLOR,
          "circle-opacity": 0.12,
          "circle-blur": 1,
        }}
      />

      {/* Core dot */}
      <Layer
        id="ports-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 1.5,
            6, 3,
            10, 6,
          ],
          "circle-color": PORT_COLOR,
          "circle-opacity": 0.85,
          "circle-stroke-color": [
            "case",
            ["get", "selected"],
            "#ffffff",
            "transparent",
          ],
          "circle-stroke-width": ["case", ["get", "selected"], 2, 0],
        }}
      />
    </Source>
  );
}

export function PortsLayer() {
  const ports = usePorts();
  return (
    <PortSelectionProvider>
      <PortsLayerInner ports={ports} />
      <PortDetailCard />
    </PortSelectionProvider>
  );
}
