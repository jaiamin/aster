import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useVolcanoes } from "./use-volcanoes";
import { VolcanoSelectionProvider, useVolcanoSelection } from "./volcano-context";
import { VolcanoDetailCard } from "./volcano-detail-card";
import type { Volcano } from "@/types/volcanoes";

const VOLCANO_COLOR = "#e85d04";
const FOCUS_ZOOM = 8;

function toGeoJSON(volcanoes: Volcano[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: volcanoes.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
      properties: {
        id: v.id,
        selected: v.id === selectedId,
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
  const pulseRef = useRef(0);

  const selectedId = selected?.volcano.id ?? null;
  const geojson = useMemo(() => toGeoJSON(volcanoes, selectedId), [volcanoes, selectedId]);

  // Pulse animation
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    let animId: number;
    const animate = () => {
      pulseRef.current = (pulseRef.current + 0.025) % (Math.PI * 2);
      const scale = 1 + 0.35 * Math.sin(pulseRef.current);
      const opacity = 0.5 - 0.2 * Math.sin(pulseRef.current);

      if (map.getLayer("volcanoes-pulse")) {
        map.setPaintProperty("volcanoes-pulse", "circle-opacity", opacity);
        map.setPaintProperty("volcanoes-pulse", "circle-stroke-width", 2 * scale);
      }

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [mapRef]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["volcanoes-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const volcano = volcanoesRef.current.find((v) => v.id === id);
        if (volcano) {
          select(volcano);
          map.flyTo({
            center: [volcano.longitude, volcano.latitude],
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

    map.on("mouseenter", "volcanoes-core", onEnter);
    map.on("mouseleave", "volcanoes-core", onLeave);
    return () => {
      map.off("mouseenter", "volcanoes-core", onEnter);
      map.off("mouseleave", "volcanoes-core", onLeave);
    };
  }, [mapRef]);

  const baseRadius: maplibregl.ExpressionSpecification = [
    "interpolate", ["linear"], ["zoom"],
    2, 5,
    6, 10,
    10, 16,
  ];

  return (
    <Source id="volcanoes-source" type="geojson" data={geojson}>
      {/* Outer glow */}
      <Layer
        id="volcanoes-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 12,
            6, 22,
            10, 36,
          ],
          "circle-color": VOLCANO_COLOR,
          "circle-opacity": 0.12,
          "circle-blur": 1,
        }}
      />

      {/* Pulsing ring */}
      <Layer
        id="volcanoes-pulse"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 8,
            6, 14,
            10, 24,
          ],
          "circle-color": "transparent",
          "circle-opacity": 0.5,
          "circle-stroke-color": VOLCANO_COLOR,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.7,
        }}
      />

      {/* Core dot */}
      <Layer
        id="volcanoes-core"
        type="circle"
        paint={{
          "circle-radius": baseRadius,
          "circle-color": VOLCANO_COLOR,
          "circle-opacity": 0.9,
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

export function VolcanoesLayer() {
  const volcanoes = useVolcanoes();
  return (
    <VolcanoSelectionProvider>
      <VolcanoesLayerInner volcanoes={volcanoes} />
      <VolcanoDetailCard />
    </VolcanoSelectionProvider>
  );
}
