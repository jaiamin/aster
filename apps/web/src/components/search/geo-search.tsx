import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, Search, X } from "lucide-react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import simplify from "@turf/simplify";
import { useModuleSelection, useModuleFilter, useRegion } from "@/modules/module-context";
import { RegionDetailCard } from "./region-detail-card";

interface NominatimResult {
  place_id: number;
  display_name: string;
  class: string;
  type: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  geojson?: GeoJSON.Geometry;
}

const ALLOWED_TYPES = new Set([
  // Political / administrative
  "continent",
  "country",
  "state",
  "province",
  "region",
  "county",
  "city",
  "town",
  "village",
  "hamlet",
  "suburb",
  "district",
  "municipality",
  "administrative",
  "territory",
  // Water bodies
  "ocean",
  "sea",
  "bay",
  "gulf",
  "strait",
  "channel",
  "fjord",
  "reef",
  "atoll",
  // Landforms
  "island",
  "archipelago",
  "peninsula",
  "cape",
  "isthmus",
  // Terrain
  "mountain",
  "volcano",
  "peak",
  "mountain_range",
  "ridge",
  "glacier",
  "valley",
  // Waterways
  "river",
  "lake",
  "reservoir",
  "water",
]);

function isAllowedResult(r: NominatimResult): boolean {
  if (ALLOWED_TYPES.has(r.type)) return true;
  if (r.class === "boundary" && r.type === "administrative") return true;
  if (r.class === "place") return true;
  if (r.class === "natural") return true;
  if (r.class === "waterway") return true;
  return false;
}

const FALLBACK_ZOOM = 14;

type Bbox = [number, number, number, number]; // [west, south, east, north]

/** Compute bbox from a flat list of [lng, lat] coordinates. */
function bboxFromCoords(coords: number[][]): Bbox {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** Degree-area of a bbox (rough proxy for geographic size). */
function bboxArea(b: Bbox): number {
  return (b[2] - b[0]) * (b[3] - b[1]);
}

/** Union two bboxes. */
function bboxUnion(a: Bbox, b: Bbox): Bbox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

/** Parse Nominatim's boundingbox [south, north, west, east] → our Bbox [west, south, east, north]. */
function nominatimBbox(bb: [string, string, string, string]): Bbox {
  return [parseFloat(bb[2]), parseFloat(bb[0]), parseFloat(bb[3]), parseFloat(bb[1])];
}

/** Minimum area ratio for a polygon to be included (filters overseas territories). */
const OUTLIER_THRESHOLD = 0.01;
/** If the union bbox spans more than this in longitude, fall back to largest only. */
const MAX_LNG_SPAN = 180;

/**
 * Compute tight bbox from GeoJSON with outlier rejection.
 *
 * - Point: returns null (caller should use Nominatim boundingbox fallback)
 * - LineString / MultiLineString: bbox from all coordinates
 * - Polygon: bbox from outer ring
 * - MultiPolygon: union with outlier rejection
 */
function bboxFromGeometry(geom: GeoJSON.Geometry): Bbox | null {
  if (geom.type === "Point") return null;

  if (geom.type === "LineString") {
    if (geom.coordinates.length === 0) return null;
    return bboxFromCoords(geom.coordinates as number[][]);
  }

  if (geom.type === "MultiLineString") {
    const all = geom.coordinates.flat() as number[][];
    if (all.length === 0) return null;
    return bboxFromCoords(all);
  }

  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    if (!ring || ring.length === 0) return null;
    return bboxFromCoords(ring as number[][]);
  }

  if (geom.type === "MultiPolygon") {
    const parts: { bbox: Bbox; area: number }[] = [];
    for (const polygon of geom.coordinates) {
      const ring = polygon[0];
      if (!ring || ring.length === 0) continue;
      const bbox = bboxFromCoords(ring as number[][]);
      parts.push({ bbox, area: bboxArea(bbox) });
    }
    if (parts.length === 0) return null;

    const maxArea = Math.max(...parts.map((p) => p.area));
    const kept = parts.filter((p) => p.area >= maxArea * OUTLIER_THRESHOLD);

    let result = kept[0].bbox;
    for (let i = 1; i < kept.length; i++) {
      result = bboxUnion(result, kept[i].bbox);
    }

    if (result[2] - result[0] > MAX_LNG_SPAN) {
      const largest = parts.reduce((a, b) => (b.area > a.area ? b : a));
      return largest.bbox;
    }

    return result;
  }

  return null;
}

/** Resolve the best bbox for a result: prefer GeoJSON geometry, fall back to Nominatim bbox. */
function resolveBbox(result: NominatimResult): Bbox | null {
  const geoBbox = result.geojson ? bboxFromGeometry(result.geojson) : null;
  if (geoBbox) return geoBbox;
  // Nominatim always provides a boundingbox, even for Points — use it as fallback
  if (result.boundingbox) {
    const nb = nominatimBbox(result.boundingbox);
    // If the Nominatim bbox is an epsilon point (~0.001°), it's useless
    if (nb[2] - nb[0] < 0.01 && nb[3] - nb[1] < 0.01) return null;
    return nb;
  }
  return null;
}

/** Approximate distance in km between two lat/lng points. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance threshold for proximity deduplication (km). */
const DEDUP_DISTANCE_KM = 50;

/**
 * Post-process Nominatim results:
 * 1. Union river segments that share the same name into one result
 * 2. Deduplicate by proximity — if two results are within 50km, keep the higher-ranked one
 */
function deduplicateResults(results: NominatimResult[]): NominatimResult[] {
  // 1. Group and merge river/waterway segments by name prefix
  const riverKey = (r: NominatimResult) => {
    if (r.class !== "waterway") return null;
    // Use first part of display_name as the river identity
    return r.display_name.split(",")[0].trim().toLowerCase();
  };

  const riverGroups = new Map<string, NominatimResult[]>();
  const nonRivers: NominatimResult[] = [];

  for (const r of results) {
    const key = riverKey(r);
    if (key) {
      const group = riverGroups.get(key) ?? [];
      group.push(r);
      riverGroups.set(key, group);
    } else {
      nonRivers.push(r);
    }
  }

  // Merge each river group into a single result with unioned bbox
  const mergedRivers: NominatimResult[] = [];
  for (const [, group] of riverGroups) {
    const primary = group[0]; // highest-ranked segment
    if (group.length > 1) {
      // Union all segment bboxes into the primary result's boundingbox
      let union: Bbox | null = null;
      for (const seg of group) {
        const segBbox = seg.geojson ? bboxFromGeometry(seg.geojson) : null;
        const bbox = segBbox ?? nominatimBbox(seg.boundingbox);
        union = union ? bboxUnion(union, bbox) : bbox;
      }
      if (union) {
        // Store the unioned bbox back as Nominatim format [south, north, west, east]
        primary.boundingbox = [
          String(union[1]),
          String(union[3]),
          String(union[0]),
          String(union[2]),
        ] as [string, string, string, string];
        // Clear geojson so resolveBbox uses the unioned Nominatim bbox
        primary.geojson = undefined;
      }
    }
    mergedRivers.push(primary);
  }

  // 2. Combine and deduplicate by proximity
  const combined = [...nonRivers, ...mergedRivers];
  // Sort by original index (Nominatim returns results by relevance)
  combined.sort((a, b) => results.indexOf(a) - results.indexOf(b));

  const kept: NominatimResult[] = [];
  for (const r of combined) {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    const tooClose = kept.some(
      (k) => haversineKm(lat, lon, parseFloat(k.lat), parseFloat(k.lon)) < DEDUP_DISTANCE_KM,
    );
    if (!tooClose) kept.push(r);
  }

  return kept;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Symbol layer prefixes that represent clickable place/water labels. */
const LABEL_LAYER_PREFIXES = ["place_", "water_name"];

function isLabelLayer(id: string): boolean {
  return LABEL_LAYER_PREFIXES.some((p) => id.startsWith(p));
}

/** Extract the English name from a MapLibre feature's properties. */
function labelName(properties: Record<string, unknown>): string | null {
  const name =
    (properties["name_en"] as string) ??
    (properties["name:latin"] as string) ??
    (properties["name"] as string) ??
    null;
  return name && name.trim().length > 0 ? name.trim() : null;
}

/** Search Nominatim and return the best matching result.
 *  If nearLngLat is provided, picks the closest result to that point
 *  instead of the first (highest-ranked) result. */
async function searchNominatim(
  query: string,
  signal: AbortSignal,
  nearLngLat?: { lng: number; lat: number },
): Promise<NominatimResult | null> {
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: query,
        format: "json",
        polygon_geojson: "1",
        dedupe: "1",
        limit: "10",
      }),
    { signal, headers: { "Accept-Language": "en" } },
  );
  const data: NominatimResult[] = await resp.json();
  const filtered = deduplicateResults(data.filter(isAllowedResult));
  if (filtered.length === 0) return null;

  if (nearLngLat) {
    // Pick the result closest to where the user clicked
    let best = filtered[0];
    let bestDist = haversineKm(
      nearLngLat.lat,
      nearLngLat.lng,
      parseFloat(best.lat),
      parseFloat(best.lon),
    );
    for (let i = 1; i < filtered.length; i++) {
      const d = haversineKm(
        nearLngLat.lat,
        nearLngLat.lng,
        parseFloat(filtered[i].lat),
        parseFloat(filtered[i].lon),
      );
      if (d < bestDist) {
        best = filtered[i];
        bestDist = d;
      }
    }
    return best;
  }

  return filtered[0];
}

const GEO_SEARCH_ID = "geo-search";

export function GeoSearch() {
  const { current: mapRef } = useMap();
  const { registerDeselect, unregisterDeselect, notifySelected, deselectAll } =
    useModuleSelection();
  const { searchQuery: urlSearchQuery, setSearchQuery: setUrlSearchQuery } = useModuleFilter();
  const { setRegionBoundary, regionActive, isInRegion } = useRegion();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection>(EMPTY_FC);
  const activeNameRef = useRef("");
  const savedBoundsRef = useRef<{
    bbox: [number, number, number, number] | null;
    center: [number, number];
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);
  const labelAbortRef = useRef<AbortController>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced Nominatim search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2 || query === activeNameRef.current) {
      if (query !== activeNameRef.current) setResults([]);
      return;
    }
    timerRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: query,
            format: "json",
            polygon_geojson: "1",
            dedupe: "1",
            limit: "20",
          }),
        {
          signal: controller.signal,
          headers: { "Accept-Language": "en" },
        },
      )
        .then((r) => r.json())
        .then((data: NominatimResult[]) => {
          const filtered = deduplicateResults(data.filter(isAllowedResult)).slice(0, 6);
          setResults(filtered);
          setOpen(filtered.length > 0);
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  const selectResult = useCallback(
    (result: NominatimResult) => {
      const map = mapRef?.getMap();
      if (!map) return;

      notifySelected(GEO_SEARCH_ID);

      const center: [number, number] = [parseFloat(result.lon), parseFloat(result.lat)];
      const bbox = resolveBbox(result);

      // Save for recenter
      savedBoundsRef.current = { bbox, center };

      if (bbox) {
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 60, duration: 2000 },
        );
      } else {
        map.flyTo({ center, zoom: FALLBACK_ZOOM, duration: 2000 });
      }

      // Set boundary outline (only for real polygon/line geometries, not points)
      if (result.geojson && result.geojson.type !== "Point") {
        // Simplify geometry for rendering — keeps visual fidelity but reduces vertex count
        const displayGeometry = simplify(
          { type: "Feature", geometry: result.geojson, properties: {} },
          { tolerance: 0.01, highQuality: true },
        ).geometry;

        setBoundary({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: displayGeometry,
              properties: {},
            },
          ],
        });
        // Activate region filtering with moderately simplified polygon for containment tests
        // (~200m accuracy is more than sufficient for pin dimming, and ~10x fewer vertices)
        if (result.geojson.type === "Polygon" || result.geojson.type === "MultiPolygon") {
          const containmentGeometry = simplify(
            { type: "Feature", geometry: result.geojson, properties: {} },
            { tolerance: 0.002, highQuality: true },
          ).geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
          setRegionBoundary(containmentGeometry);
        } else {
          setRegionBoundary(null);
        }
      } else {
        setBoundary(EMPTY_FC);
        setRegionBoundary(null);
      }

      // Set the place name as the input value and sync to URL
      const name = result.display_name.split(",")[0].trim();
      activeNameRef.current = name;
      setQuery(name);
      setUrlSearchQuery(name);
      setResults([]);
      setOpen(false);
      inputRef.current?.blur();
    },
    [mapRef, notifySelected, setUrlSearchQuery, setRegionBoundary],
  );

  const recenter = useCallback(() => {
    const map = mapRef?.getMap();
    const saved = savedBoundsRef.current;
    if (!map || !saved) return;

    if (saved.bbox) {
      map.fitBounds(
        [
          [saved.bbox[0], saved.bbox[1]],
          [saved.bbox[2], saved.bbox[3]],
        ],
        { padding: 60, duration: 1200 },
      );
    } else {
      map.flyTo({ center: saved.center, zoom: FALLBACK_ZOOM, duration: 1200 });
    }
  }, [mapRef]);

  const clearBoundary = useCallback(() => {
    setBoundary(EMPTY_FC);
    setRegionBoundary(null);
    activeNameRef.current = "";
    savedBoundsRef.current = null;
    setQuery("");
    setUrlSearchQuery("");
  }, [setUrlSearchQuery, setRegionBoundary]);

  // Register with global selection system so module pins can clear search
  useEffect(() => {
    registerDeselect(GEO_SEARCH_ID, clearBoundary);
    return () => unregisterDeselect(GEO_SEARCH_ID);
  }, [registerDeselect, unregisterDeselect, clearBoundary]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-geo-search]")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (open) {
          inputRef.current?.blur();
          setOpen(false);
        } else {
          // Dismiss any open detail cards + clear region in one press
          deselectAll();
          if (regionActive) clearBoundary();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, regionActive, clearBoundary, deselectAll]);

  // Keep stable refs so the map click handler always uses the latest values
  const selectResultRef = useRef(selectResult);
  selectResultRef.current = selectResult;
  const clearBoundaryRef = useRef(clearBoundary);
  clearBoundaryRef.current = clearBoundary;
  const regionActiveRef = useRef(regionActive);
  regionActiveRef.current = regionActive;
  const isInRegionRef = useRef(isInRegion);
  isInRegionRef.current = isInRegion;

  // Restore search from URL on mount
  useEffect(() => {
    if (!urlSearchQuery) return;
    const controller = new AbortController();
    searchNominatim(urlSearchQuery, controller.signal)
      .then((result) => {
        if (result) selectResultRef.current(result);
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // Click-on-label: query symbol layers at click point, search Nominatim, auto-select
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleLabelClick = (e: maplibregl.MapMouseEvent) => {
      // Let data pin handlers run first — they set _layerHandled
      requestAnimationFrame(() => {
        if ((e.originalEvent as unknown as Record<string, unknown>)._layerHandled) return;

        // Find all symbol layers currently in the style that are place/water labels
        const styleLayers = map.getStyle()?.layers ?? [];
        const labelLayerIds = styleLayers
          .filter((l) => l.type === "symbol" && isLabelLayer(l.id))
          .map((l) => l.id);
        if (labelLayerIds.length === 0) return;

        const features = map.queryRenderedFeatures(e.point, { layers: labelLayerIds });
        if (features.length === 0) return;

        const name = labelName(features[0].properties as Record<string, unknown>);
        if (!name) return;

        // Mark as handled so no other handler fires
        (e.originalEvent as unknown as Record<string, unknown>)._layerHandled = true;

        // Search Nominatim and auto-select the closest result to the click point
        labelAbortRef.current?.abort();
        const controller = new AbortController();
        labelAbortRef.current = controller;
        const clickLngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat };

        searchNominatim(name, controller.signal, clickLngLat)
          .then((result) => {
            if (result) selectResultRef.current(result);
          })
          .catch(() => {});
      });
    };

    // Pointer cursor on label hover — throttled and with cached layer IDs
    let cachedLabelLayerIds: string[] | null = null;
    let lastMoveTime = 0;
    const THROTTLE_MS = 50;

    const refreshLabelLayerIds = () => {
      const styleLayers = map.getStyle()?.layers ?? [];
      cachedLabelLayerIds = styleLayers
        .filter((l) => l.type === "symbol" && isLabelLayer(l.id))
        .map((l) => l.id);
    };

    // Build cache once now and refresh when the style changes (e.g. dark ↔ satellite)
    refreshLabelLayerIds();
    map.on("styledata", refreshLabelLayerIds);

    let labelCursorActive = false;

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const now = performance.now();
      if (now - lastMoveTime < THROTTLE_MS) return;
      lastMoveTime = now;

      if (!cachedLabelLayerIds || cachedLabelLayerIds.length === 0) return;
      const canvas = map.getCanvas();

      const features = map.queryRenderedFeatures(e.point, { layers: cachedLabelLayerIds });
      if (features.length > 0) {
        // Don't override cursor if a data pin layer already set it
        if (!labelCursorActive && canvas.style.cursor === "pointer") return;
        canvas.style.cursor = "pointer";
        labelCursorActive = true;
      } else if (labelCursorActive) {
        canvas.style.cursor = "";
        labelCursorActive = false;
      }
    };

    map.on("click", handleLabelClick);
    map.on("mousemove", onMouseMove);
    return () => {
      map.off("click", handleLabelClick);
      map.off("mousemove", onMouseMove);
      map.off("styledata", refreshLabelLayerIds);
      labelAbortRef.current?.abort();
    };
  }, [mapRef]);

  // Click outside region boundary → clear region (runs after all other handlers)
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      // Run after rAF handlers (label click, satellite deselect) so _layerHandled is settled
      setTimeout(() => {
        if ((e.originalEvent as unknown as Record<string, unknown>)._layerHandled) return;
        if (!regionActiveRef.current) return;
        const { lng, lat } = e.lngLat;
        if (!isInRegionRef.current(lng, lat)) {
          clearBoundaryRef.current();
        }
      }, 0);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mapRef]);

  const hasSelection = boundary.features.length > 0 || activeNameRef.current !== "";

  return (
    <>
      {/* Search input */}
      <div className="absolute left-3 top-2.25 z-20" data-geo-search>
        <div className="relative">
          <div className="flex h-8 items-center gap-2 border border-panel-border bg-panel/95 backdrop-blur-sm px-2.5 shadow-lg min-w-[280px]">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={(e) => {
                e.target.select();
                if (results.length > 0) setOpen(true);
              }}
              placeholder="Search location"
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted/60 outline-none"
            />
            {hasSelection && (
              <>
                <button
                  onClick={recenter}
                  className="shrink-0 text-muted hover:text-foreground transition-colors"
                  aria-label="Recenter on search result"
                >
                  <LocateFixed size={14} />
                </button>
                <button
                  onClick={clearBoundary}
                  className="shrink-0 text-muted hover:text-foreground transition-colors"
                  aria-label="Clear boundary"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>

          {/* Results dropdown */}
          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-panel-border bg-panel/95 backdrop-blur-sm shadow-lg max-h-[240px] overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  onClick={() => selectResult(r)}
                  className="w-full px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:bg-panel-hover"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Boundary outline layer */}
      <Source id="geo-search-boundary" type="geojson" data={boundary}>
        <Layer
          id="geo-search-boundary-fill"
          type="fill"
          paint={{
            "fill-color": "#3d7ab5",
            "fill-opacity": 0.1,
          }}
        />
        <Layer
          id="geo-search-boundary-line"
          type="line"
          paint={{
            "line-color": "#5a9fd4",
            "line-width": 3,
            "line-opacity": 1,
          }}
        />
      </Source>

      {/* Region detail card */}
      {regionActive && (
        <RegionDetailCard
          name={activeNameRef.current}
          onRecenter={recenter}
          onClose={clearBoundary}
        />
      )}
    </>
  );
}
