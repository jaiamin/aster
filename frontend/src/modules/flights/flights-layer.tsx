import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useFlights } from "./use-flights";
import { FlightSelectionProvider, useFlightSelection } from "./flight-context";
import { FlightDetailCard } from "./flight-detail-card";
import { useModuleCount } from "@/hooks/use-module-count";
import { filterByBounds } from "@/lib/viewport";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Flight, FlightTrack, SelectedFlight } from "@/types/flights";

const ICON_NORMAL = "plane-icon";
const ICON_SELECTED = "plane-icon-selected";
const ICON_SIZE = 48;
const DPR = 2;

function planePath(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const s = size / 24;

  // Fuselage
  ctx.beginPath();
  ctx.moveTo(cx, 2 * s);
  ctx.lineTo(cx + 2 * s, cx + 4 * s);
  ctx.lineTo(cx, size - 2 * s);
  ctx.lineTo(cx - 2 * s, cx + 4 * s);
  ctx.closePath();

  // Wings
  ctx.moveTo(cx, cx - 1 * s);
  ctx.lineTo(cx + 9 * s, cx + 5 * s);
  ctx.lineTo(cx + 9 * s, cx + 6 * s);
  ctx.lineTo(cx, cx + 2 * s);
  ctx.lineTo(cx - 9 * s, cx + 6 * s);
  ctx.lineTo(cx - 9 * s, cx + 5 * s);
  ctx.closePath();

  // Tail
  ctx.moveTo(cx, size - 5 * s);
  ctx.lineTo(cx + 4 * s, size - 2 * s);
  ctx.lineTo(cx - 4 * s, size - 2 * s);
  ctx.closePath();
}

function createPlaneIcon(fillColor: string, strokeColor: string): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE * DPR;
  canvas.height = ICON_SIZE * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  const s = ICON_SIZE / 24;

  // Outline
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5 * s;
  ctx.lineJoin = "round";
  planePath(ctx, ICON_SIZE);
  ctx.stroke();

  // Fill
  ctx.fillStyle = fillColor;
  planePath(ctx, ICON_SIZE);
  ctx.fill();

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  return data;
}

function toGeoJSON(flights: Flight[], selectedIcao: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: flights.map((f) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
      properties: {
        icao24: f.icao24,
        callsign: f.callsign,
        true_track: f.true_track ?? 0,
        selected: f.icao24 === selectedIcao,
      },
    })),
  };
}

function trackToGeoJSON(track: FlightTrack): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: track.path.map((wp) => [wp.longitude, wp.latitude]),
    },
    properties: {},
  };
}

function airportsToGeoJSON(selected: SelectedFlight): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const route = selected.detail?.route;
  if (!route) return { type: "FeatureCollection", features };

  for (const ap of [route.origin, route.destination]) {
    if (ap?.latitude != null && ap?.longitude != null) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [ap.longitude, ap.latitude] },
        properties: { icao: ap.icao, name: ap.name },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function FlightsLayerInner({ flights }: { flights: Flight[] }) {
  const { current: mapRef } = useMap();
  const { selected, tracking, select, deselect } = useFlightSelection();
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const flyingToRef = useRef(false);
  const [moveCount, setMoveCount] = useState(0);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onMove = () => setMoveCount((c) => c + 1);
    map.on("moveend", onMove);
    return () => { map.off("moveend", onMove); };
  }, [mapRef]);

  // Register plane icon variants
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    if (!map.hasImage(ICON_NORMAL)) {
      map.addImage(ICON_NORMAL, createPlaneIcon("#b0b8c4", "#ffffff"), { pixelRatio: DPR });
    }
    if (!map.hasImage(ICON_SELECTED)) {
      map.addImage(ICON_SELECTED, createPlaneIcon("#3d7ab5", "#ffffff"), { pixelRatio: DPR });
    }
    return () => {
      if (map.hasImage(ICON_NORMAL)) map.removeImage(ICON_NORMAL);
      if (map.hasImage(ICON_SELECTED)) map.removeImage(ICON_SELECTED);
    };
  }, [mapRef]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["flights-layer"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const icao24 = features[0].properties?.icao24;
        const flight = flightsRef.current.find((f) => f.icao24 === icao24);
        if (flight) {
          flyingToRef.current = true;
          select(flight);
          map.flyTo({
            center: [flight.longitude, flight.latitude],
            zoom: FOCUS_ZOOM["flights"],
            duration: 1500,
          });
          map.once("moveend", () => {
            flyingToRef.current = false;
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

    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

    map.on("mouseenter", "flights-layer", onEnter);
    map.on("mouseleave", "flights-layer", onLeave);
    return () => {
      map.off("mouseenter", "flights-layer", onEnter);
      map.off("mouseleave", "flights-layer", onLeave);
    };
  }, [mapRef]);

  // Camera follow
  useEffect(() => {
    if (!selected || !mapRef || flyingToRef.current || !tracking) return;
    mapRef.easeTo({
      center: [selected.flight.longitude, selected.flight.latitude],
      duration: 1000,
    });
  }, [selected?.flight.longitude, selected?.flight.latitude, mapRef, tracking]);

  const selectedIcao = selected?.flight.icao24 ?? null;
  const geojson = useMemo(() => {
    const map = mapRef?.getMap();
    const visible = map ? filterByBounds(flights, (f) => [f.longitude, f.latitude], map) : flights;
    return toGeoJSON(visible, selectedIcao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights, selectedIcao, moveCount]);
  const trackGeoJSON = useMemo(
    () => (selected?.track ? trackToGeoJSON(selected.track) : null),
    [selected?.track],
  );
  const airportGeoJSON = useMemo(
    () => (selected ? airportsToGeoJSON(selected) : null),
    [selected?.detail?.route],
  );

  return (
    <>
      {trackGeoJSON && (
        <Source id="flight-track" type="geojson" data={trackGeoJSON}>
          <Layer
            id="flight-track-layer"
            type="line"
            beforeId="flights-layer"
            paint={{
              "line-color": "#3d7ab5",
              "line-width": 2,
              "line-opacity": 0.7,
            }}
          />
        </Source>
      )}

      {airportGeoJSON && airportGeoJSON.features.length > 0 && (
        <Source id="flight-airports" type="geojson" data={airportGeoJSON}>
          <Layer
            id="flight-airports-circle"
            type="circle"
            beforeId="flights-layer"
            paint={{
              "circle-radius": 5,
              "circle-color": "#3d7ab5",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
            }}
          />
          <Layer
            id="flight-airports-label"
            type="symbol"
            beforeId="flights-layer"
            layout={{
              "text-field": ["get", "icao"],
              "text-size": 11,
              "text-offset": [0, 1.5],
              "text-anchor": "top",
            }}
            paint={{
              "text-color": "#e2e8f0",
              "text-halo-color": "#0f1520",
              "text-halo-width": 1,
            }}
          />
        </Source>
      )}

      <Source id="flights-source" type="geojson" data={geojson}>
        <Layer
          id="flights-layer"
          type="symbol"
          layout={{
            "icon-image": ["case", ["get", "selected"], ICON_SELECTED, ICON_NORMAL],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2, 0.4,
              5, 0.7,
              8, 1.1,
              12, 1.8,
            ],
            "icon-rotate": ["get", "true_track"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          paint={{}}
        />
      </Source>
    </>
  );
}

export function FlightsLayer() {
  const flights = useFlights();
  useModuleCount("flights", flights.length);
  return (
    <FlightSelectionProvider flights={flights}>
      <FlightsLayerInner flights={flights} />
      <FlightDetailCard />
    </FlightSelectionProvider>
  );
}
