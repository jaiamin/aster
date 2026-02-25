import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useEarthquakes } from "./use-earthquakes";
import { EarthquakeSelectionProvider, useEarthquakeSelection } from "./earthquake-context";
import { EarthquakeDetailCard } from "./earthquake-detail-card";
import type { Earthquake } from "@/types/earthquakes";

const MAG_COLOR: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "magnitude"],
  2.5, "#22c55e",
  4.0, "#eab308",
  5.5, "#f97316",
  7.0, "#ef4444",
  8.0, "#dc2626",
];

const MAG_RADIUS: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["exponential", 2],
  ["get", "magnitude"],
  2.5, 4,
  5.0, 12,
  7.0, 28,
  9.0, 52,
];

const FOCUS_ZOOM = 7;

function toGeoJSON(quakes: Earthquake[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: quakes.map((q) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [q.longitude, q.latitude] },
      properties: {
        id: q.id,
        magnitude: q.magnitude,
        selected: q.id === selectedId,
      },
    })),
  };
}

function EarthquakesLayerInner({ quakes }: { quakes: Earthquake[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useEarthquakeSelection();
  const quakesRef = useRef(quakes);
  quakesRef.current = quakes;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pulseRef = useRef(0);

  const selectedId = selected?.quake.id ?? null;
  const geojson = useMemo(() => toGeoJSON(quakes, selectedId), [quakes, selectedId]);

  // Pulse animation on the outer ring
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    let animId: number;
    const animate = () => {
      pulseRef.current = (pulseRef.current + 0.02) % (Math.PI * 2);
      const scale = 1 + 0.3 * Math.sin(pulseRef.current);
      const opacity = 0.6 - 0.25 * Math.sin(pulseRef.current);

      if (map.getLayer("earthquakes-pulse")) {
        map.setPaintProperty("earthquakes-pulse", "circle-opacity", opacity);
        // Scale radius by modifying stroke width as a visual pulse
        map.setPaintProperty("earthquakes-pulse", "circle-stroke-width", 2 * scale);
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
        layers: ["earthquakes-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const quake = quakesRef.current.find((q) => q.id === id);
        if (quake) {
          select(quake);
          map.flyTo({
            center: [quake.longitude, quake.latitude],
            zoom: FOCUS_ZOOM,
            duration: 1500,
          });
        }
      } else if (selectedRef.current && !consumed) {
        deselect();
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mapRef, select, deselect]);

  // Pointer cursor on hover
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("mouseenter", "earthquakes-core", onEnter);
    map.on("mouseleave", "earthquakes-core", onLeave);
    return () => {
      map.off("mouseenter", "earthquakes-core", onEnter);
      map.off("mouseleave", "earthquakes-core", onLeave);
    };
  }, [mapRef]);

  return (
    <Source id="earthquakes-source" type="geojson" data={geojson}>
      {/* Outer glow — soft blurred halo */}
      <Layer
        id="earthquakes-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            ["*", MAG_RADIUS, 0.8],
            8,
            ["*", MAG_RADIUS, 1.6],
          ],
          "circle-color": MAG_COLOR,
          "circle-opacity": 0.15,
          "circle-blur": 1,
        }}
      />

      {/* Pulsing ring — animated stroke */}
      <Layer
        id="earthquakes-pulse"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            ["*", MAG_RADIUS, 0.6],
            8,
            ["*", MAG_RADIUS, 1.2],
          ],
          "circle-color": "transparent",
          "circle-opacity": 0.6,
          "circle-stroke-color": MAG_COLOR,
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.8,
        }}
      />

      {/* Core dot — solid, bright */}
      <Layer
        id="earthquakes-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            ["*", MAG_RADIUS, 0.3],
            8,
            ["*", MAG_RADIUS, 0.6],
          ],
          "circle-color": MAG_COLOR,
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

export function EarthquakesLayer() {
  const quakes = useEarthquakes();
  return (
    <EarthquakeSelectionProvider>
      <EarthquakesLayerInner quakes={quakes} />
      <EarthquakeDetailCard />
    </EarthquakeSelectionProvider>
  );
}
