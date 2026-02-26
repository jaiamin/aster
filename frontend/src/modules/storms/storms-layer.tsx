import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { CloudLightning } from "lucide-react";
import { useStorms } from "./use-storms";
import { StormSelectionProvider, useStormSelection } from "./storm-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { StormDetailCard } from "./storm-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Storm } from "@/types/storms";

const MODULE_ID = "storms";

const STATUS_VARIANTS = [
  { key: "td", dotColor: "#22c55e" },
  { key: "hurricane", dotColor: "#eab308" },
  { key: "major", dotColor: "#ef4444" },
];

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function categoryToStatusKey(cat: number): string {
  if (cat >= 3) return "major";
  if (cat >= 1) return "hurricane";
  return "td";
}

export function stormAccentColor(cat: number): string {
  if (cat >= 3) return "#ef4444";
  if (cat >= 1) return "#eab308";
  return "#22c55e";
}

function toGeoJSON(storms: Storm[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: storms.map((s) => {
      const key = categoryToStatusKey(s.category);
      const sel = s.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
        properties: {
          id: s.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function buildPastTrackGeoJSON(storm: Storm): GeoJSON.FeatureCollection {
  if (storm.pastTrack.length < 2) return EMPTY_FC;
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "LineString", coordinates: storm.pastTrack },
      properties: {},
    }],
  };
}

function buildForecastTrackGeoJSON(storm: Storm): GeoJSON.FeatureCollection {
  if (storm.forecastTrack.length === 0) return EMPTY_FC;
  const coords: [number, number][] = [
    [storm.longitude, storm.latitude],
    ...storm.forecastTrack.map((p) => [p.lng, p.lat] as [number, number]),
  ];
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    }],
  };
}

function StormsLayerInner({ storms }: { storms: Storm[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useStormSelection();
  const stormsRef = useRef(storms);
  stormsRef.current = storms;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.storm.id ?? null;
  const geojson = useMemo(() => toGeoJSON(storms, selectedId), [storms, selectedId]);

  const pastTrackData = useMemo(
    () => (selected ? buildPastTrackGeoJSON(selected.storm) : EMPTY_FC),
    [selected],
  );
  const forecastTrackData = useMemo(
    () => (selected ? buildForecastTrackGeoJSON(selected.storm) : EMPTY_FC),
    [selected],
  );
  const trackColor = selected ? stormAccentColor(selected.storm.category) : "#ffffff";

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: CloudLightning, bgColor: CATEGORY_COLORS["Natural Events"], statusVariants: STATUS_VARIANTS };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler — selection via centralized dispatcher
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const storm = stormsRef.current.find((s) => s.id === id);
      if (storm) {
        select(storm);
        map.flyTo({ center: [storm.longitude, storm.latitude], zoom: FOCUS_ZOOM["storms"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  // Deselect on empty click
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!(e.originalEvent as any)._layerHandled && selectedRef.current) deselect();
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, deselect]);

  // Pointer cursor
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.on("mouseenter", `${MODULE_ID}-pins`, onEnter);
    map.on("mouseleave", `${MODULE_ID}-pins`, onLeave);
    return () => {
      map.off("mouseenter", `${MODULE_ID}-pins`, onEnter);
      map.off("mouseleave", `${MODULE_ID}-pins`, onLeave);
    };
  }, [mapRef]);

  if (!ready) return null;

  return (
    <>
      {/* Past track — solid line */}
      <Source id={`${MODULE_ID}-past-track-source`} type="geojson" data={pastTrackData}>
        <Layer
          id={`${MODULE_ID}-past-track`}
          type="line"
          beforeId={`${MODULE_ID}-pins`}
          paint={{
            "line-color": trackColor,
            "line-opacity": 0.7,
            "line-width": 2.5,
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </Source>

      {/* Forecast track — dashed line */}
      <Source id={`${MODULE_ID}-forecast-track-source`} type="geojson" data={forecastTrackData}>
        <Layer
          id={`${MODULE_ID}-forecast-track`}
          type="line"
          beforeId={`${MODULE_ID}-pins`}
          paint={{
            "line-color": trackColor,
            "line-opacity": 0.5,
            "line-width": 2,
            "line-dasharray": [4, 3],
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </Source>

      {/* Storm pins */}
      <Source id={`${MODULE_ID}-source`} type="geojson" data={geojson}>
        <Layer
          id={`${MODULE_ID}-pins`}
          type="symbol"
          layout={{
            "icon-image": ["get", "pinImage"],
            "icon-size": 1,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />
      </Source>
    </>
  );
}

export function StormsLayer() {
  const storms = useStorms();
  useModuleCount("storms", storms?.length ?? null);
  return (
    <StormSelectionProvider>
      <StormsLayerInner storms={storms ?? []} />
      <StormDetailCard />
    </StormSelectionProvider>
  );
}
