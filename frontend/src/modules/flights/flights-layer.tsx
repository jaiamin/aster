import { useCallback, useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useFlights } from "./use-flights";
import { FlightSelectionProvider, useFlightSelection } from "./flight-context";
import { FlightDetailCard } from "./flight-detail-card";
import type { Flight, FlightTrack, SelectedFlight } from "@/types/flights";

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
  ctx.moveTo(cx, 2);
  ctx.lineTo(cx + 2, cy + 4);
  ctx.lineTo(cx, ICON_SIZE - 2);
  ctx.lineTo(cx - 2, cy + 4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy - 1);
  ctx.lineTo(cx + 9, cy + 5);
  ctx.lineTo(cx + 9, cy + 6);
  ctx.lineTo(cx, cy + 2);
  ctx.lineTo(cx - 9, cy + 6);
  ctx.lineTo(cx - 9, cy + 5);
  ctx.closePath();
  ctx.fill();

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

const FOCUS_ZOOM = 7;

function FlightsLayerInner({ flights }: { flights: Flight[] }) {
  const { current: mapRef } = useMap();
  const { selected, tracking, select, deselect } = useFlightSelection();
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const flyingToRef = useRef(false);

  // Register plane icon
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    if (!map.hasImage(ICON_ID)) {
      map.addImage(ICON_ID, createPlaneIcon(), { sdf: false });
    }
  }, [mapRef]);

  // Click handler — select or deselect
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["flights-layer"],
      });

      if (features.length > 0) {
        const icao24 = features[0].properties?.icao24;
        const flight = flightsRef.current.find((f) => f.icao24 === icao24);
        if (flight) {
          flyingToRef.current = true;
          select(flight);
          map.flyTo({
            center: [flight.longitude, flight.latitude],
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

    map.on("mouseenter", "flights-layer", onEnter);
    map.on("mouseleave", "flights-layer", onLeave);
    return () => {
      map.off("mouseenter", "flights-layer", onEnter);
      map.off("mouseleave", "flights-layer", onLeave);
    };
  }, [mapRef]);

  // Camera lock — follow selected plane (skip during initial fly-to or when paused)
  useEffect(() => {
    if (!selected || !mapRef || flyingToRef.current || !tracking) return;
    mapRef.easeTo({
      center: [selected.flight.longitude, selected.flight.latitude],
      duration: 1000,
    });
  }, [selected?.flight.longitude, selected?.flight.latitude, mapRef, tracking]);

  const geojson = useMemo(() => toGeoJSON(flights), [flights]);
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
            paint={{
              "line-color": "#00d4ff",
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
            paint={{
              "circle-radius": 5,
              "circle-color": "#00d4ff",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
            }}
          />
          <Layer
            id="flight-airports-label"
            type="symbol"
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
            "icon-rotate": ["get", "true_track"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />
      </Source>
    </>
  );
}

export function FlightsLayer() {
  const flights = useFlights();
  return (
    <FlightSelectionProvider flights={flights}>
      <FlightsLayerInner flights={flights} />
      <FlightDetailCard />
    </FlightSelectionProvider>
  );
}
