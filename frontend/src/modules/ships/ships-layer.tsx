import { useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useShips } from "./use-ships";
import type { Ship } from "@/types/ships";

const ICON_ID = "ship-icon";
const ICON_SIZE = 24;

function createShipIcon(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d")!;

  const cx = ICON_SIZE / 2;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  // Ship hull — pointed bow at top, flat stern at bottom
  ctx.moveTo(cx, 2); // bow
  ctx.lineTo(cx + 5, 10);
  ctx.lineTo(cx + 5, 20);
  ctx.lineTo(cx + 3, 22); // stern corner
  ctx.lineTo(cx - 3, 22);
  ctx.lineTo(cx - 5, 20);
  ctx.lineTo(cx - 5, 10);
  ctx.closePath();
  ctx.fill();

  // Bridge — small rectangle near center
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(cx - 2, 12, 4, 4);

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

function toGeoJSON(ships: Ship[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ships.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      properties: {
        mmsi: s.mmsi,
        name: s.name,
        course: s.course ?? 0,
      },
    })),
  };
}

export function ShipsLayer() {
  const ships = useShips();
  const { current: mapRef } = useMap();

  // Register ship icon
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    if (!map.hasImage(ICON_ID)) {
      map.addImage(ICON_ID, createShipIcon(), { sdf: false });
    }
  }, [mapRef]);

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

    map.on("mouseenter", "ships-layer", onEnter);
    map.on("mouseleave", "ships-layer", onLeave);
    return () => {
      map.off("mouseenter", "ships-layer", onEnter);
      map.off("mouseleave", "ships-layer", onLeave);
    };
  }, [mapRef]);

  const geojson = useMemo(() => toGeoJSON(ships), [ships]);

  return (
    <Source id="ships-source" type="geojson" data={geojson}>
      <Layer
        id="ships-layer"
        type="symbol"
        layout={{
          "icon-image": ICON_ID,
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            0.3,
            5,
            0.6,
            8,
            1,
            12,
            1.8,
          ],
          "icon-rotate": ["get", "course"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
      />
    </Source>
  );
}
