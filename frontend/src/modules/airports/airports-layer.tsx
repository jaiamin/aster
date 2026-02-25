import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useAirports } from "./use-airports";
import { AirportSelectionProvider, useAirportSelection } from "./airport-context";
import { AirportDetailCard } from "./airport-detail-card";
import type { Airport } from "@/types/airports";

const TYPE_COLOR: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "type"],
  "large_airport", "#00d4ff",
  "medium_airport", "#5b9bd5",
  "#5b9bd5",
];

const TYPE_RADIUS: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "type"],
  "large_airport", 1.4,
  "medium_airport", 1.0,
  1.0,
];

const FOCUS_ZOOM = 12;

function toGeoJSON(airports: Airport[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: airports.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: {
        id: a.id,
        type: a.type,
        selected: a.id === selectedId,
      },
    })),
  };
}

function AirportsLayerInner({ airports }: { airports: Airport[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useAirportSelection();
  const airportsRef = useRef(airports);
  airportsRef.current = airports;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const selectedId = selected?.airport.id ?? null;
  const geojson = useMemo(() => toGeoJSON(airports, selectedId), [airports, selectedId]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["airports-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const airport = airportsRef.current.find((a) => a.id === id);
        if (airport) {
          select(airport);
          map.flyTo({
            center: [airport.longitude, airport.latitude],
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

    map.on("mouseenter", "airports-core", onEnter);
    map.on("mouseleave", "airports-core", onLeave);
    return () => {
      map.off("mouseenter", "airports-core", onEnter);
      map.off("mouseleave", "airports-core", onLeave);
    };
  }, [mapRef]);

  return (
    <Source id="airports-source" type="geojson" data={geojson}>
      {/* Glow */}
      <Layer
        id="airports-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, ["*", 3, TYPE_RADIUS],
            6, ["*", 6, TYPE_RADIUS],
            10, ["*", 12, TYPE_RADIUS],
          ],
          "circle-color": TYPE_COLOR,
          "circle-opacity": 0.12,
          "circle-blur": 1,
        }}
      />

      {/* Core dot */}
      <Layer
        id="airports-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, ["*", 1.5, TYPE_RADIUS],
            6, ["*", 3, TYPE_RADIUS],
            10, ["*", 6, TYPE_RADIUS],
          ],
          "circle-color": TYPE_COLOR,
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

export function AirportsLayer() {
  const airports = useAirports();
  return (
    <AirportSelectionProvider>
      <AirportsLayerInner airports={airports} />
      <AirportDetailCard />
    </AirportSelectionProvider>
  );
}
