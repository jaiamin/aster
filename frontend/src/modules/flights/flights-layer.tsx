import { useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useFlights } from "./use-flights";
import type { Flight } from "@/types/flights";

const ICON_ID = "plane-icon";
const ICON_SIZE = 24;

function createPlaneIcon(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d")!;

  const cx = ICON_SIZE / 2;
  const cy = ICON_SIZE / 2;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  // Fuselage
  ctx.moveTo(cx, 2);
  ctx.lineTo(cx + 2, cy + 4);
  ctx.lineTo(cx, ICON_SIZE - 2);
  ctx.lineTo(cx - 2, cy + 4);
  ctx.closePath();
  ctx.fill();
  // Wings
  ctx.beginPath();
  ctx.moveTo(cx, cy - 1);
  ctx.lineTo(cx + 9, cy + 5);
  ctx.lineTo(cx + 9, cy + 6);
  ctx.lineTo(cx, cy + 2);
  ctx.lineTo(cx - 9, cy + 6);
  ctx.lineTo(cx - 9, cy + 5);
  ctx.closePath();
  ctx.fill();
  // Tail
  ctx.beginPath();
  ctx.moveTo(cx, ICON_SIZE - 5);
  ctx.lineTo(cx + 4, ICON_SIZE - 2);
  ctx.lineTo(cx - 4, ICON_SIZE - 2);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

function toGeoJSON(flights: Flight[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: flights.map((f) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
      properties: {
        icao24: f.icao24,
        callsign: f.callsign,
        true_track: f.true_track ?? 0,
      },
    })),
  };
}

export function FlightsLayer() {
  const { current: mapRef } = useMap();
  const flights = useFlights();

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    if (!map.hasImage(ICON_ID)) {
      map.addImage(ICON_ID, createPlaneIcon(), { sdf: false });
    }
  }, [mapRef]);

  const geojson = useMemo(() => toGeoJSON(flights), [flights]);

  return (
    <Source id="flights-source" type="geojson" data={geojson}>
      <Layer
        id="flights-layer"
        type="symbol"
        layout={{
          "icon-image": ICON_ID,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.3, 5, 0.6, 8, 1, 12, 1.8],
          "icon-rotate": ["get", "true_track"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
      />
    </Source>
  );
}
