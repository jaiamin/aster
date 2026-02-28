import { useCallback, useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useFlights } from "./use-flights";
import { FlightSelectionProvider, useFlightSelection } from "./flight-context";
import { FlightDetailCard } from "./flight-detail-card";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { useRegionCount } from "@/hooks/use-region-count";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useMapZoom } from "@/hooks/use-map-zoom";
import { registerLayerClick } from "@/lib/layer-click";
import { gridSample } from "@/lib/grid-sample";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { useModuleSelect } from "@/hooks/use-module-select";
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

function toGeoJSON(flights: Flight[], selectedIcao: string | null, inRegionSet: Set<string | number>): GeoJSON.FeatureCollection {
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
        inRegion: inRegionSet.size === 0 || inRegionSet.has(f.icao24),
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

function FlightsLayerInner({ flights, inRegionSet, regionActive }: { flights: Flight[]; inRegionSet: Set<string | number>; regionActive: boolean }) {
  const { current: mapRef } = useMap();
  const zoom = useMapZoom();
  const { selected, tracking, select, deselect, pauseTracking } = useFlightSelection();
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;
  const flyingToRef = useRef(false);

  const selectFromExplorer = useCallback((flight: Flight) => {
    flyingToRef.current = true;
    select(flight);
    const map = mapRef?.getMap();
    if (map) {
      map.flyTo({ center: [flight.longitude, flight.latitude], zoom: FOCUS_ZOOM["flights"], duration: 1500, padding: DETAIL_CARD_PADDING });
      map.once("moveend", () => { flyingToRef.current = false; });
    }
  }, [select, mapRef]);
  useModuleSelect("flights", selectFromExplorer);

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
      if (!map.style) return;
      if (map.hasImage(ICON_NORMAL)) map.removeImage(ICON_NORMAL);
      if (map.hasImage(ICON_SELECTED)) map.removeImage(ICON_SELECTED);
    };
  }, [mapRef]);

  // Click handler — selection via centralized dispatcher
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick("flights-layer", (feature, e) => {
      const icao24 = feature.properties?.icao24;
      const flight = flightsRef.current.find((f) => f.icao24 === icao24);
      if (flight) {
        flyingToRef.current = true;
        select(flight);
        map.flyTo({
          center: [flight.longitude, flight.latitude],
          zoom: FOCUS_ZOOM["flights"],
          duration: 1500,
          padding: DETAIL_CARD_PADDING,
        });
        map.once("moveend", () => {
          flyingToRef.current = false;
        });
      }
    });
  }, [mapRef, select]);

  // Deselect on empty click
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!(e.originalEvent as any)._layerHandled && selectedRef.current) {
        deselect();
      }
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, deselect]);

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

  // Pause tracking on user-initiated map interaction
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleUserMove = () => {
      if (flyingToRef.current || !selectedRef.current || !trackingRef.current) return;
      pauseTracking();
    };

    map.on("dragstart", handleUserMove);
    map.on("wheel", handleUserMove);
    return () => {
      map.off("dragstart", handleUserMove);
      map.off("wheel", handleUserMove);
    };
  }, [mapRef, pauseTracking]);

  // Camera follow
  useEffect(() => {
    if (!selected || !mapRef || flyingToRef.current || !tracking) return;
    mapRef.easeTo({
      center: [selected.flight.longitude, selected.flight.latitude],
      duration: 1000,
      padding: DETAIL_CARD_PADDING,
    });
  }, [selected?.flight.longitude, selected?.flight.latitude, mapRef, tracking]);

  const selectedIcao = selected?.flight.icao24 ?? null;
  const zoomBand = zoom < 5 ? 0 : 1;
  const sampled = useMemo(
    () =>
      gridSample(
        flights,
        (f) => f.longitude,
        (f) => f.latitude,
        (f) => f.icao24 === selectedIcao,
        zoom,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flights, selectedIcao, zoomBand],
  );
  const geojson = useMemo(() => toGeoJSON(sampled, selectedIcao, inRegionSet), [sampled, selectedIcao, inRegionSet]);
  const trackGeoJSON = useMemo(
    () => (selected?.track ? trackToGeoJSON(selected.track) : null),
    [selected?.track],
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
          paint={{ "icon-opacity": regionActive ? ["case", ["get", "inRegion"], 1, 0.2] : 1 }}
        />
      </Source>
    </>
  );
}

export function FlightsLayer() {
  const flights = useFlights();

  useModuleData("flights", flights);

  const matchesFilters = useExplorerFilters("flights");
  const filtered = useMemo(
    () => flights ? flights.filter(matchesFilters) : null,
    [flights, matchesFilters],
  );

  useModuleCount("flights", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [], (f) => f.icao24, (f) => f.longitude, (f) => f.latitude,
  );
  useRegionCount("flights", regionCount);
  const resolved = filtered ?? [];
  return (
    <FlightSelectionProvider flights={resolved}>
      <FlightsLayerInner flights={resolved} inRegionSet={inRegionSet} regionActive={regionActive} />
      <FlightDetailCard />
    </FlightSelectionProvider>
  );
}
