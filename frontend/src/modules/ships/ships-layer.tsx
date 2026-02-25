import { useCallback, useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useShips } from "./use-ships";
import { ShipSelectionProvider, useShipSelection } from "./ship-context";
import { ShipDetailCard } from "./ship-detail-card";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Ship } from "@/types/ships";

const ICON_NORMAL = "ship-icon";
const ICON_SELECTED = "ship-icon-selected";
const ICON_SIZE = 48;
const DPR = 2;

function drawShip(ctx: CanvasRenderingContext2D, size: number, fillColor: string, strokeColor: string) {
  const cx = size / 2;
  const s = size / 24; // scale from 24-unit design

  // Hull shape
  ctx.beginPath();
  ctx.moveTo(cx, 2 * s);
  ctx.lineTo(cx + 5 * s, 10 * s);
  ctx.lineTo(cx + 5 * s, 20 * s);
  ctx.lineTo(cx + 3 * s, 22 * s);
  ctx.lineTo(cx - 3 * s, 22 * s);
  ctx.lineTo(cx - 5 * s, 20 * s);
  ctx.lineTo(cx - 5 * s, 10 * s);
  ctx.closePath();

  // Outline
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5 * s;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Fill
  ctx.fillStyle = fillColor;
  ctx.fill();

}

function createShipIcon(fillColor: string, strokeColor: string): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE * DPR;
  canvas.height = ICON_SIZE * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  drawShip(ctx, ICON_SIZE, fillColor, strokeColor);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function toGeoJSON(ships: Ship[], selectedMmsi: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ships.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      properties: {
        mmsi: s.mmsi,
        name: s.name,
        course: s.course ?? 0,
        selected: s.mmsi === selectedMmsi,
      },
    })),
  };
}

function ShipsLayerInner({ ships }: { ships: Ship[] }) {
  const { current: mapRef } = useMap();
  const { selected, tracking, select, deselect } = useShipSelection();
  const shipsRef = useRef(ships);
  shipsRef.current = ships;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const flyingToRef = useRef(false);

  // Register ship icon variants
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    if (!map.hasImage(ICON_NORMAL)) {
      map.addImage(ICON_NORMAL, createShipIcon("#b0b8c4", "#ffffff"), { pixelRatio: DPR });
    }
    if (!map.hasImage(ICON_SELECTED)) {
      map.addImage(ICON_SELECTED, createShipIcon("#00d4ff", "#ffffff"), { pixelRatio: DPR });
    }
  }, [mapRef]);

  // Click handler — select or deselect
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["ships-layer"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const mmsi = features[0].properties?.mmsi;
        const ship = shipsRef.current.find((s) => s.mmsi === mmsi);
        if (ship) {
          flyingToRef.current = true;
          select(ship);
          map.flyTo({
            center: [ship.longitude, ship.latitude],
            zoom: FOCUS_ZOOM["ships"],
            duration: 1500,
          });
          map.once("moveend", () => {
            flyingToRef.current = false;
          });
        }
      } else if (selectedRef.current) {
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

    map.on("mouseenter", "ships-layer", onEnter);
    map.on("mouseleave", "ships-layer", onLeave);
    return () => {
      map.off("mouseenter", "ships-layer", onEnter);
      map.off("mouseleave", "ships-layer", onLeave);
    };
  }, [mapRef]);

  // Camera lock — follow selected ship
  useEffect(() => {
    if (!selected || !mapRef || flyingToRef.current || !tracking) return;
    mapRef.easeTo({
      center: [selected.ship.longitude, selected.ship.latitude],
      duration: 1000,
    });
  }, [selected?.ship.longitude, selected?.ship.latitude, mapRef, tracking]);

  const selectedMmsi = selected?.ship.mmsi ?? null;
  const geojson = useMemo(() => toGeoJSON(ships, selectedMmsi), [ships, selectedMmsi]);

  return (
    <Source id="ships-source" type="geojson" data={geojson}>
      <Layer
        id="ships-layer"
        type="symbol"
        layout={{
          "icon-image": ["case", ["get", "selected"], ICON_SELECTED, ICON_NORMAL],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2, 0.15,
            5, 0.3,
            8, 0.5,
            12, 0.9,
          ],
          "icon-rotate": ["get", "course"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
        paint={{}}

      />
    </Source>
  );
}

export function ShipsLayer() {
  const ships = useShips();
  return (
    <ShipSelectionProvider ships={ships}>
      <ShipsLayerInner ships={ships} />
      <ShipDetailCard />
    </ShipSelectionProvider>
  );
}
