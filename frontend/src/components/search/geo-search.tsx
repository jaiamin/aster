import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, Search, X } from "lucide-react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";

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
  "continent", "country", "state", "province", "region", "county",
  "city", "town", "village", "hamlet", "suburb", "district", "municipality",
  "administrative", "territory",
  // Water bodies
  "ocean", "sea", "bay", "gulf", "strait", "channel", "fjord", "reef", "atoll",
  // Landforms
  "island", "archipelago", "peninsula", "cape", "isthmus",
  // Terrain
  "mountain", "volcano", "peak", "mountain_range", "ridge", "glacier", "valley",
  // Waterways
  "river", "lake", "reservoir", "water",
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

/** Compute bbox [west, south, east, north] from a single ring of coordinates. */
function bboxFromRing(ring: number[][]): [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** Compute tight bbox from GeoJSON, using the largest polygon for MultiPolygon. */
function bboxFromGeometry(geom: GeoJSON.Geometry): [number, number, number, number] | null {
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    if (!ring || ring.length === 0) return null;
    return bboxFromRing(ring as number[][]);
  }

  if (geom.type === "MultiPolygon") {
    // Find the polygon with the most coordinates (the "main" landmass)
    let largestRing: number[][] | null = null;
    let maxLen = 0;
    for (const polygon of geom.coordinates) {
      const ring = polygon[0];
      if (ring && ring.length > maxLen) {
        maxLen = ring.length;
        largestRing = ring as number[][];
      }
    }
    if (!largestRing) return null;
    return bboxFromRing(largestRing);
  }

  // Point, LineString, etc. — no meaningful bbox for fit
  return null;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function GeoSearch() {
  const { current: mapRef } = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection>(EMPTY_FC);
  const activeNameRef = useRef("");
  const savedBoundsRef = useRef<{ bbox: [number, number, number, number] | null; center: [number, number] } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
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
          const filtered = data.filter(isAllowedResult).slice(0, 6);
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

      const center: [number, number] = [parseFloat(result.lon), parseFloat(result.lat)];
      const geoBbox = result.geojson ? bboxFromGeometry(result.geojson) : null;

      // Save for recenter
      savedBoundsRef.current = { bbox: geoBbox, center };

      if (geoBbox) {
        map.fitBounds(
          [[geoBbox[0], geoBbox[1]], [geoBbox[2], geoBbox[3]]],
          { padding: 60, duration: 2000 },
        );
      } else {
        map.flyTo({ center, zoom: FALLBACK_ZOOM, duration: 2000 });
      }

      // Set boundary outline
      if (result.geojson) {
        setBoundary({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: result.geojson,
              properties: {},
            },
          ],
        });
      } else {
        setBoundary(EMPTY_FC);
      }

      // Set the place name as the input value
      const name = result.display_name.split(",")[0].trim();
      activeNameRef.current = name;
      setQuery(name);
      setResults([]);
      setOpen(false);
      inputRef.current?.blur();
    },
    [mapRef],
  );

  const recenter = useCallback(() => {
    const map = mapRef?.getMap();
    const saved = savedBoundsRef.current;
    if (!map || !saved) return;

    if (saved.bbox) {
      map.fitBounds(
        [[saved.bbox[0], saved.bbox[1]], [saved.bbox[2], saved.bbox[3]]],
        { padding: 60, duration: 1200 },
      );
    } else {
      map.flyTo({ center: saved.center, zoom: FALLBACK_ZOOM, duration: 1200 });
    }
  }, [mapRef]);

  const clearBoundary = useCallback(() => {
    setBoundary(EMPTY_FC);
    activeNameRef.current = "";
    savedBoundsRef.current = null;
    setQuery("");
  }, []);

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
        inputRef.current?.blur();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasSelection = boundary.features.length > 0 || activeNameRef.current !== "";

  return (
    <>
      {/* Search input */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2" data-geo-search>
        <div className="relative">
          <div className="flex h-10 items-center gap-2 border border-panel-border bg-panel/95 backdrop-blur-sm px-3 shadow-lg min-w-[280px]">
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
        <Layer
          id="geo-search-boundary-line-glow"
          type="line"
          paint={{
            "line-color": "#3d7ab5",
            "line-width": 8,
            "line-opacity": 0.3,
            "line-blur": 4,
          }}
        />
      </Source>
    </>
  );
}
