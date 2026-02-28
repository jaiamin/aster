import { Layer, Source } from "@vis.gl/react-maplibre";
import { useMemo } from "react";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function UserLocationDot({ location }: { location: { lng: number; lat: number } | null }) {
  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!location) return EMPTY_FC;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [location.lng, location.lat] },
          properties: {},
        },
      ],
    };
  }, [location]);

  return (
    <Source id="user-location" type="geojson" data={data}>
      <Layer
        id="user-location-glow"
        type="circle"
        paint={{
          "circle-radius": 16,
          "circle-color": "#3b82f6",
          "circle-opacity": 0.15,
        }}
      />
      <Layer
        id="user-location-dot"
        type="circle"
        paint={{
          "circle-radius": 5,
          "circle-color": "#3b82f6",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        }}
      />
    </Source>
  );
}
