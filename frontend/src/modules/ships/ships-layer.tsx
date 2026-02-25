import { useCallback, useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useShips } from "./use-ships";
import { ShipSelectionProvider, useShipSelection } from "./ship-context";
import { ShipDetailCard } from "./ship-detail-card";
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
  ctx.moveTo(cx, 2);
  ctx.lineTo(cx + 5, 10);
  ctx.lineTo(cx + 5, 20);
  ctx.lineTo(cx + 3, 22);
  ctx.lineTo(cx - 3, 22);
  ctx.lineTo(cx - 5, 20);
  ctx.lineTo(cx - 5, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(cx - 2, 12, 4, 4);

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
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

const FOCUS_ZOOM = 10;

function ShipsLayerInner({ ships }: { ships: Ship[] }) {
  const { current: mapRef } = useMap();
  const { selected, tracking, select, deselect } = useShipSelection();
  const shipsRef = useRef(ships);
  shipsRef.current = ships;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const flyingToRef = useRef(false);

  // Register ship icon
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    if (!map.hasImage(ICON_ID)) {
      map.addImage(ICON_ID, createShipIcon(), { sdf: true });
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
            zoom: FOCUS_ZOOM,
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
        paint={{
          "icon-color": ["case", ["get", "selected"], "#00d4ff", "#ffffff"],
          "icon-halo-color": ["case", ["get", "selected"], "#00d4ff", "transparent"],
          "icon-halo-width": ["case", ["get", "selected"], 3, 0],
        }}
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
