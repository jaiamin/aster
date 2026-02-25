import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useBuoys } from "./use-buoys";
import { BuoySelectionProvider, useBuoySelection } from "./buoy-context";
import { BuoyDetailCard } from "./buoy-detail-card";
import type { Buoy } from "@/types/buoys";

const BUOY_COLOR = "#22d3ee";
const FOCUS_ZOOM = 8;

function toGeoJSON(buoys: Buoy[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: buoys.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
      properties: {
        id: b.id,
        hasWave: b.waveHeight != null,
        selected: b.id === selectedId,
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

  const selectedId = selected?.buoy.id ?? null;
  const geojson = useMemo(() => toGeoJSON(buoys, selectedId), [buoys, selectedId]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["buoys-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const buoy = buoysRef.current.find((b) => b.id === id);
        if (buoy) {
          select(buoy);
          map.flyTo({
            center: [buoy.longitude, buoy.latitude],
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

    map.on("mouseenter", "buoys-core", onEnter);
    map.on("mouseleave", "buoys-core", onLeave);
    return () => {
      map.off("mouseenter", "buoys-core", onEnter);
      map.off("mouseleave", "buoys-core", onLeave);
    };
  }, [mapRef]);

  return (
    <Source id="buoys-source" type="geojson" data={geojson}>
      {/* Glow */}
      <Layer
        id="buoys-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 3,
            6, 7,
            10, 14,
          ],
          "circle-color": BUOY_COLOR,
          "circle-opacity": 0.15,
          "circle-blur": 1,
        }}
      />

      {/* Core dot */}
      <Layer
        id="buoys-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 1.5,
            6, 3.5,
            10, 7,
          ],
          "circle-color": BUOY_COLOR,
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

export function BuoysLayer() {
  const buoys = useBuoys();
  return (
    <BuoySelectionProvider>
      <BuoysLayerInner buoys={buoys} />
      <BuoyDetailCard />
    </BuoySelectionProvider>
  );
}
