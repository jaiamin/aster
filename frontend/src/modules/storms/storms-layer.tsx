import { useCallback, useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { CloudLightning } from "lucide-react";
import { useStorms } from "./use-storms";
import { StormSelectionProvider, useStormSelection } from "./storm-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useModuleFilter, useRegion } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { useModuleData } from "@/hooks/use-module-data";
import { useExplorerFilters } from "@/modules/explorer-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { StormDetailCard } from "./storm-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
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

function toGeoJSON(storms: Storm[], selectedId: string | null, isInRegion: (lng: number, lat: number) => boolean): GeoJSON.FeatureCollection {
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
          inRegion: isInRegion(s.longitude, s.latitude),
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
  const selectFromExplorer = useCallback((item: any) => {
    select(item);
    const map = mapRef?.getMap();
    if (map && typeof item.longitude === "number" && typeof item.latitude === "number") {
      map.flyTo({ center: [item.longitude, item.latitude], zoom: FOCUS_ZOOM["storms"], duration: 1500, padding: DETAIL_CARD_PADDING });
    }
  }, [select, mapRef]);
  useModuleSelect("storms", selectFromExplorer);
  const stormsRef = useRef(storms);
  stormsRef.current = storms;

  const { isInRegion, regionActive } = useRegion();
  const selectedId = selected?.storm.id ?? null;
  const geojson = useMemo(() => toGeoJSON(storms, selectedId, isInRegion), [storms, selectedId, isInRegion]);

  const pastTrackData = useMemo(
    () => (selected ? buildPastTrackGeoJSON(selected.storm) : EMPTY_FC),
    [selected],
  );
  const forecastTrackData = useMemo(
    () => (selected ? buildForecastTrackGeoJSON(selected.storm) : EMPTY_FC),
    [selected],
  );
  const trackColor = selected ? stormAccentColor(selected.storm.category) : "#ffffff";

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: CloudLightning, bgColor: CATEGORY_COLORS["Events"], statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const storm = stormsRef.current.find((s) => s.id === id);
      if (storm) {
        select(storm);
        map.flyTo({ center: [storm.longitude, storm.latitude], zoom: FOCUS_ZOOM["storms"], duration: 1500, padding: DETAIL_CARD_PADDING });
      }
    });
  }, [mapRef, select]);

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
      <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={4} regionActive={regionActive} />
    </>
  );
}

export function StormsLayer() {
  const storms = useStorms();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => storms ? filterByTime(storms, "storms", timeFilter) : null,
    [storms, timeFilter],
  );

  useModuleData("storms", timeFiltered);

  const matchesFilters = useExplorerFilters("storms");
  const filtered = useMemo(
    () => timeFiltered ? timeFiltered.filter(matchesFilters) : null,
    [timeFiltered, matchesFilters],
  );

  useModuleCount("storms", filtered?.length ?? null);
  const { isInRegion, regionActive } = useRegion();
  const regionCount = useMemo(() => {
    if (!filtered || !regionActive) return null;
    return filtered.filter((s) => isInRegion(s.longitude, s.latitude)).length;
  }, [filtered, regionActive, isInRegion]);
  useRegionCount("storms", regionCount);
  return (
    <StormSelectionProvider>
      <StormsLayerInner storms={filtered ?? []} />
      <StormDetailCard />
    </StormSelectionProvider>
  );
}
