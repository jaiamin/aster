import { Layer, Source } from "@vis.gl/react-maplibre";
import { Activity } from "lucide-react";
import { useCallback, useMemo } from "react";

import { EarthquakeSelectionProvider, useEarthquakeSelection } from "./earthquake-context";
import { EarthquakeDetailCard } from "./earthquake-detail-card";
import { useEarthquakes } from "./use-earthquakes";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { filterByTime } from "@/lib/time-filter";
import { useExplorerFilters } from "@/modules/explorer-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { useModuleFilter } from "@/modules/module-context";
import type { Earthquake } from "@/types/earthquakes";

const MODULE_ID = "earthquakes";

const STATUS_VARIANTS = [
  { key: "green", dotColor: "#22c55e" },
  { key: "yellow", dotColor: "#eab308" },
  { key: "orange", dotColor: "#f97316" },
  { key: "red", dotColor: "#ef4444" },
];

function magToStatusKey(mag: number): string {
  if (mag >= 7.0) return "red";
  if (mag >= 5.5) return "orange";
  if (mag >= 4.0) return "yellow";
  return "green";
}

function toGeoJSON(
  quakes: Earthquake[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: quakes.map((q) => {
      const key = magToStatusKey(q.magnitude);
      const sel = q.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [q.longitude, q.latitude] },
        properties: {
          id: q.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
          inRegion: !regionActive || inRegionSet.has(q.id),
        },
      };
    }),
  };
}

function toHaloGeoJSON(
  quakes: Earthquake[],
  selectedId: string | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: quakes.map((q) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [q.longitude, q.latitude] },
      properties: {
        magnitude: q.magnitude,
        depth: Math.max(q.depth, 1),
        selected: q.id === selectedId ? 1 : 0,
        inRegion: !regionActive || inRegionSet.has(q.id),
      },
    })),
  };
}

function findItem(items: Earthquake[], feature: maplibregl.GeoJSONFeature): Earthquake | undefined {
  return items.find((q) => q.id === feature.properties?.id);
}

// At zoom 0, the world is ~512px wide = 40,075 km at the equator.
// 1 km ≈ 512 / 40075 ≈ 0.01278 pixels at zoom 0.
// With exponential base 2, this scales correctly across all zoom levels.
const KM_TO_PX_Z0 = 512 / 40_075;

// Target: the depth circle should be ~200px radius on screen so you can see it.
// zoom = log2(targetPx / (depth_km * KM_TO_PX_Z0))
// Capped at FOCUS_ZOOM so shallow quakes don't zoom in excessively.
const TARGET_HALO_PX = 200;
const MAX_QUAKE_ZOOM = FOCUS_ZOOM["earthquakes"];

function quakeFocusZoom(q: Earthquake): number {
  const depth = Math.max(q.depth, 1);
  const zoom = Math.log2(TARGET_HALO_PX / (depth * KM_TO_PX_Z0));
  return Math.min(zoom, MAX_QUAKE_ZOOM);
}

function EarthquakesLayerInner({
  quakes,
  inRegionSet,
  regionActive,
}: {
  quakes: Earthquake[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = useEarthquakeSelection();
  const selectedId = selected?.quake.id ?? null;

  const getFocusZoom = useCallback((q: Earthquake) => quakeFocusZoom(q), []);

  const pins = usePinLayer<Earthquake>({
    moduleId: MODULE_ID,
    items: quakes,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Activity,
    bgColor: CATEGORY_COLORS["Events"],
    statusVariants: STATUS_VARIANTS,
    clusterMaxZoom: 12,
    inRegionSet,
    regionActive,
    getFocusZoom,
  });

  const haloGeoJSON = useMemo(
    () => toHaloGeoJSON(quakes, selectedId, inRegionSet, regionActive),
    [quakes, selectedId, inRegionSet, regionActive],
  );

  return (
    <>
      {/* Depth halo — rendered below pins */}
      <Source id="earthquakes-halo-source" type="geojson" data={haloGeoJSON}>
        <Layer
          id="earthquakes-halo"
          type="circle"
          layout={{
            "circle-sort-key": ["get", "magnitude"],
          }}
          paint={{
            "circle-pitch-alignment": "map",
            // Radius: depth in km at true 1:1 geographic scale.
            "circle-radius": [
              "interpolate",
              ["exponential", 2],
              ["zoom"],
              0,
              ["*", ["get", "depth"], KM_TO_PX_Z0],
              20,
              ["*", ["get", "depth"], KM_TO_PX_Z0 * Math.pow(2, 20)],
            ],
            "circle-color": "#ef4444",
            // Selected: nearly full red. Unselected: magnitude-driven dimness.
            "circle-opacity": regionActive
              ? [
                  "case",
                  ["==", ["get", "selected"], 1],
                  0.7,
                  ["get", "inRegion"],
                  [
                    "interpolate",
                    ["linear"],
                    ["get", "magnitude"],
                    2,
                    0.05,
                    4,
                    0.12,
                    5.5,
                    0.25,
                    7,
                    0.45,
                  ],
                  0.03,
                ]
              : [
                  "case",
                  ["==", ["get", "selected"], 1],
                  0.7,
                  [
                    "interpolate",
                    ["linear"],
                    ["get", "magnitude"],
                    2,
                    0.05,
                    4,
                    0.12,
                    5.5,
                    0.25,
                    7,
                    0.45,
                  ],
                ],
            "circle-blur": 0.3,
            "circle-stroke-width": [
              "case",
              ["==", ["get", "selected"], 1],
              2,
              ["interpolate", ["linear"], ["get", "magnitude"], 2, 0.5, 5, 1, 7, 1.5],
            ],
            "circle-stroke-color": "#ef4444",
            "circle-stroke-opacity": [
              "case",
              ["==", ["get", "selected"], 1],
              0.9,
              regionActive ? ["case", ["get", "inRegion"], 0.4, 0.08] : 0.4,
            ],
          }}
        />
      </Source>

      {/* Pin markers (clustered) */}
      {pins}
    </>
  );
}

export function EarthquakesLayer() {
  const quakes = useEarthquakes();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => (quakes ? filterByTime(quakes, "earthquakes", timeFilter) : null),
    [quakes, timeFilter],
  );

  useModuleData("earthquakes", timeFiltered);

  const matchesFilters = useExplorerFilters("earthquakes");
  const filtered = useMemo(
    () => (timeFiltered ? timeFiltered.filter(matchesFilters) : null),
    [timeFiltered, matchesFilters],
  );

  useModuleCount("earthquakes", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (q) => q.id,
    (q) => q.longitude,
    (q) => q.latitude,
  );
  useRegionCount("earthquakes", regionCount);
  return (
    <EarthquakeSelectionProvider>
      <EarthquakesLayerInner
        quakes={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <EarthquakeDetailCard />
    </EarthquakeSelectionProvider>
  );
}
