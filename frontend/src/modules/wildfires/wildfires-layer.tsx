import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useWildfires } from "./use-wildfires";
import { WildfireSelectionProvider, useWildfireSelection } from "./wildfire-context";
import { WildfireDetailCard } from "./wildfire-detail-card";
import type { Wildfire } from "@/types/wildfires";

// FRP (fire radiative power) drives size — logarithmic to handle huge range
const FRP_RADIUS: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "frp"],
  5, 3,
  50, 8,
  200, 16,
  1000, 28,
];

// Color gradient: warm yellow core → deep orange → red for intense fires
const FRP_COLOR: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "frp"],
  5, "#ff9800",
  50, "#ff5722",
  200, "#f44336",
  1000, "#b71c1c",
];

const FOCUS_ZOOM = 9;

function toGeoJSON(fires: Wildfire[], selectedIdx: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fires.map((f, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
      properties: {
        idx: i,
        frp: f.frp,
        brightness: f.brightness,
        selected: i === selectedIdx,
      },
    })),
  };
}

function WildfiresLayerInner({ fires }: { fires: Wildfire[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useWildfireSelection();
  const firesRef = useRef(fires);
  firesRef.current = fires;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pulseRef = useRef(0);

  const selectedIdx = selected
    ? fires.findIndex(
        (f) =>
          f.latitude === selected.fire.latitude &&
          f.longitude === selected.fire.longitude &&
          f.frp === selected.fire.frp,
      )
    : null;

  const geojson = useMemo(() => toGeoJSON(fires, selectedIdx), [fires, selectedIdx]);

  // Pulse animation — flickering glow
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    let animId: number;
    const animate = () => {
      pulseRef.current = (pulseRef.current + 0.03) % (Math.PI * 2);
      const flicker = 0.15 + 0.08 * Math.sin(pulseRef.current);

      if (map.getLayer("wildfires-glow")) {
        map.setPaintProperty("wildfires-glow", "circle-opacity", flicker);
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
        layers: ["wildfires-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const idx = features[0].properties?.idx;
        const fire = firesRef.current[idx];
        if (fire) {
          select(fire);
          map.flyTo({
            center: [fire.longitude, fire.latitude],
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

    map.on("mouseenter", "wildfires-core", onEnter);
    map.on("mouseleave", "wildfires-core", onLeave);
    return () => {
      map.off("mouseenter", "wildfires-core", onEnter);
      map.off("mouseleave", "wildfires-core", onLeave);
    };
  }, [mapRef]);

  return (
    <Source id="wildfires-source" type="geojson" data={geojson}>
      {/* Outer heat glow — large, blurred, animated flicker */}
      <Layer
        id="wildfires-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            ["*", FRP_RADIUS, 1.2],
            8,
            ["*", FRP_RADIUS, 2.5],
          ],
          "circle-color": FRP_COLOR,
          "circle-opacity": 0.15,
          "circle-blur": 1,
        }}
      />

      {/* Inner heat — warm bright center */}
      <Layer
        id="wildfires-inner"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            ["*", FRP_RADIUS, 0.5],
            8,
            ["*", FRP_RADIUS, 1.0],
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "frp"],
            5, "#ffcc02",
            50, "#ff9800",
            200, "#ff5722",
            1000, "#f44336",
          ],
          "circle-opacity": 0.6,
          "circle-blur": 0.5,
        }}
      />

      {/* Core hotspot — solid bright point */}
      <Layer
        id="wildfires-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            ["*", FRP_RADIUS, 0.25],
            8,
            ["*", FRP_RADIUS, 0.5],
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "frp"],
            5, "#fff176",
            50, "#ffcc02",
            200, "#ff9800",
            1000, "#ff5722",
          ],
          "circle-opacity": 0.95,
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

export function WildfiresLayer() {
  const fires = useWildfires();
  return (
    <WildfireSelectionProvider>
      <WildfiresLayerInner fires={fires} />
      <WildfireDetailCard />
    </WildfireSelectionProvider>
  );
}
