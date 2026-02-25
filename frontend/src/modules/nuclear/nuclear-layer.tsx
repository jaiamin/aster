import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useNuclear } from "./use-nuclear";
import { NuclearSelectionProvider, useNuclearSelection } from "./nuclear-context";
import { NuclearDetailCard } from "./nuclear-detail-card";
import type { NuclearFacility } from "@/types/nuclear";

// Status-based colors
const STATUS_COLOR: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "status"],
  "Operational", "#00e400",
  "Under Construction", "#ffff00",
  "Planned", "#00bfff",
  "Shutdown", "#888888",
  "Decommissioning Completed", "#555555",
  "Suspended Operation", "#ff7e00",
  "Suspended Construction", "#ff7e00",
  "Cancelled Construction", "#555555",
  "Never Commissioned", "#555555",
  "#888888", // default
];

const FOCUS_ZOOM = 10;

function toGeoJSON(facilities: NuclearFacility[], selectedId: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: facilities.map((f) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
      properties: {
        id: f.id,
        status: f.status,
        capacity: f.capacity ?? 0,
        selected: f.id === selectedId,
      },
    })),
  };
}

function NuclearLayerInner({ facilities }: { facilities: NuclearFacility[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useNuclearSelection();
  const facilitiesRef = useRef(facilities);
  facilitiesRef.current = facilities;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pulseRef = useRef(0);

  const selectedId = selected?.facility.id ?? null;
  const geojson = useMemo(() => toGeoJSON(facilities, selectedId), [facilities, selectedId]);

  // Pulse animation on glow ring
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    let animId: number;
    const animate = () => {
      pulseRef.current = (pulseRef.current + 0.015) % (Math.PI * 2);
      const opacity = 0.15 + 0.08 * Math.sin(pulseRef.current);

      if (map.getLayer("nuclear-glow")) {
        map.setPaintProperty("nuclear-glow", "circle-opacity", opacity);
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
        layers: ["nuclear-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const facility = facilitiesRef.current.find((f) => f.id === id);
        if (facility) {
          select(facility);
          map.flyTo({
            center: [facility.longitude, facility.latitude],
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

    map.on("mouseenter", "nuclear-core", onEnter);
    map.on("mouseleave", "nuclear-core", onLeave);
    return () => {
      map.off("mouseenter", "nuclear-core", onEnter);
      map.off("mouseleave", "nuclear-core", onLeave);
    };
  }, [mapRef]);

  return (
    <Source id="nuclear-source" type="geojson" data={geojson}>
      {/* Radioactive glow — slow pulse */}
      <Layer
        id="nuclear-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 6,
            6, 12,
            10, 22,
          ],
          "circle-color": STATUS_COLOR,
          "circle-opacity": 0.15,
          "circle-blur": 1,
        }}
      />

      {/* Core dot */}
      <Layer
        id="nuclear-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 2.5,
            6, 5,
            10, 9,
          ],
          "circle-color": STATUS_COLOR,
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

export function NuclearLayer() {
  const facilities = useNuclear();
  return (
    <NuclearSelectionProvider>
      <NuclearLayerInner facilities={facilities} />
      <NuclearDetailCard />
    </NuclearSelectionProvider>
  );
}
