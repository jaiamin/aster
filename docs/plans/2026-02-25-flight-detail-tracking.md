# Flight Detail & Tracking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Click a plane on the globe to see its flight path, airport endpoints, aircraft details in a floating card, and lock the camera to follow it.

**Architecture:** Backend proxies OpenSky track data and hexdb.io aircraft/route/airport data behind two new endpoints with caching. Frontend adds a selection context that drives a flight path line layer, airport markers, camera lock, and a floating detail card.

**Tech Stack:** FastAPI + httpx (backend), React + MapLibre GL + @vis.gl/react-maplibre (frontend), Tailwind CSS, hexdb.io (free aircraft data)

---

### Task 1: Add flight types

**Files:**
- Modify: `frontend/src/types/flights.ts`

**Step 1: Add types for track, detail, and airport data**

Add after the existing `FlightsResponse` interface:

```typescript
export interface TrackWaypoint {
  time: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  heading: number | null;
  on_ground: boolean;
}

export interface FlightTrack {
  icao24: string;
  callsign: string;
  startTime: number;
  endTime: number;
  path: TrackWaypoint[];
}

export interface Airport {
  icao: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface FlightDetail {
  aircraft: {
    registration: string | null;
    type: string | null;
    icaoType: string | null;
    manufacturer: string | null;
    operator: string | null;
  } | null;
  route: {
    origin: Airport | null;
    destination: Airport | null;
  } | null;
}

export interface SelectedFlight {
  flight: Flight;
  track: FlightTrack | null;
  detail: FlightDetail | null;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/flights.ts
git commit -m "feat: add flight detail, track, and airport types"
```

---

### Task 2: Backend track endpoint

**Files:**
- Modify: `backend/app/routers/flights.py`

**Step 1: Add track endpoint after the existing `get_flights` function**

Add a simple per-icao24 cache dict and the endpoint:

```python
_track_cache: dict[str, tuple[float, dict]] = {}
TRACK_CACHE_TTL = 30.0

@router.get("/flights/{icao24}/track")
async def get_flight_track(icao24: str):
    now = _time.monotonic()
    cached = _track_cache.get(icao24)
    if cached and (now - cached[0]) < TRACK_CACHE_TTL:
        return cached[1]

    url = f"{settings.opensky_base_url}/tracks/all"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            token = await _get_token(client)
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            resp = await client.get(url, params={"icao24": icao24, "time": 0}, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="OpenSky track error")
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Failed to reach OpenSky API")

    data = resp.json()
    path = []
    for wp in data.get("path") or []:
        path.append({
            "time": wp[0],
            "latitude": wp[1],
            "longitude": wp[2],
            "altitude": wp[3],
            "heading": wp[4],
            "on_ground": wp[5],
        })

    result = {
        "icao24": data.get("icao24"),
        "callsign": (data.get("callsign") or "").strip(),
        "startTime": data.get("startTime"),
        "endTime": data.get("endTime"),
        "path": path,
    }
    _track_cache[icao24] = (now, result)
    return result
```

**Step 2: Verify endpoint starts**

Run: `cd backend && uv run uvicorn app.main:app --reload`
Test: `curl http://localhost:8000/api/flights/<any-icao24>/track`
Expected: JSON with path array (or 4xx if icao24 not currently in flight)

**Step 3: Commit**

```bash
git add backend/app/routers/flights.py
git commit -m "feat: add flight track endpoint proxying OpenSky"
```

---

### Task 3: Backend detail endpoint

**Files:**
- Modify: `backend/app/routers/flights.py`

**Step 1: Add detail endpoint**

This fetches aircraft info, route, and airport data from hexdb.io in parallel:

```python
HEXDB_BASE = "https://hexdb.io/api/v1"
_detail_cache: dict[str, tuple[float, dict]] = {}
DETAIL_CACHE_TTL = 300.0  # 5 min — aircraft details are static

@router.get("/flights/{icao24}/detail")
async def get_flight_detail(icao24: str, callsign: str = ""):
    now = _time.monotonic()
    cache_key = f"{icao24}:{callsign}"
    cached = _detail_cache.get(cache_key)
    if cached and (now - cached[0]) < DETAIL_CACHE_TTL:
        return cached[1]

    async with httpx.AsyncClient(timeout=10.0) as client:
        aircraft_req = client.get(f"{HEXDB_BASE}/aircraft/{icao24}")
        route_req = client.get(f"{HEXDB_BASE}/route/icao/{callsign}") if callsign else None

        aircraft_resp = await aircraft_req
        route_resp = await route_req if route_req else None

    # Parse aircraft
    aircraft = None
    if aircraft_resp.status_code == 200:
        a = aircraft_resp.json()
        aircraft = {
            "registration": a.get("Registration"),
            "type": a.get("Type"),
            "icaoType": a.get("ICAOTypeCode"),
            "manufacturer": a.get("Manufacturer"),
            "operator": a.get("RegisteredOwners"),
        }

    # Parse route + fetch airports
    route = None
    if route_resp and route_resp.status_code == 200:
        r = route_resp.json()
        origin_icao = r.get("origin", {}).get("icao")
        dest_icao = r.get("destination", {}).get("icao")

        async with httpx.AsyncClient(timeout=10.0) as client:
            tasks = {}
            if origin_icao:
                tasks["origin"] = client.get(f"{HEXDB_BASE}/airport/icao/{origin_icao}")
            if dest_icao:
                tasks["destination"] = client.get(f"{HEXDB_BASE}/airport/icao/{dest_icao}")

            airports = {}
            for key, req in tasks.items():
                resp = await req
                if resp.status_code == 200:
                    ap = resp.json()
                    airports[key] = {
                        "icao": ap.get("ICAO"),
                        "name": ap.get("Name"),
                        "latitude": ap.get("Latitude"),
                        "longitude": ap.get("Longitude"),
                    }

        route = {
            "origin": airports.get("origin"),
            "destination": airports.get("destination"),
        }

    result = {"aircraft": aircraft, "route": route}
    _detail_cache[cache_key] = (now, result)
    return result
```

**Step 2: Verify endpoint**

Test: `curl "http://localhost:8000/api/flights/4010ee/detail?callsign=EZY1234"`
Expected: JSON with aircraft and route objects (fields may be null if hexdb doesn't have data)

**Step 3: Commit**

```bash
git add backend/app/routers/flights.py
git commit -m "feat: add flight detail endpoint proxying hexdb.io"
```

---

### Task 4: Frontend selection context

**Files:**
- Create: `frontend/src/modules/flights/flight-context.tsx`

**Step 1: Create the context**

This holds which flight is selected, the fetched detail/track, and a deselect function. It also handles camera lock by exposing the selected flight's current position.

```tsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Flight, FlightDetail, FlightTrack, SelectedFlight } from "@/types/flights";

interface FlightSelectionContextValue {
  selected: SelectedFlight | null;
  select: (flight: Flight) => void;
  deselect: () => void;
}

const FlightSelectionContext = createContext<FlightSelectionContextValue | null>(null);

export function FlightSelectionProvider({
  flights,
  children,
}: {
  flights: Flight[];
  children: React.ReactNode;
}) {
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [track, setTrack] = useState<FlightTrack | null>(null);
  const [detail, setDetail] = useState<FlightDetail | null>(null);

  const currentFlight = selectedIcao
    ? flights.find((f) => f.icao24 === selectedIcao) ?? null
    : null;

  const select = useCallback((flight: Flight) => {
    setSelectedIcao(flight.icao24);
    setTrack(null);
    setDetail(null);
  }, []);

  const deselect = useCallback(() => {
    setSelectedIcao(null);
    setTrack(null);
    setDetail(null);
  }, []);

  // Fetch track + detail when selection changes
  useEffect(() => {
    if (!currentFlight) return;
    const controller = new AbortController();

    fetch(`/api/flights/${currentFlight.icao24}/track`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setTrack(data))
      .catch(() => {});

    const qs = currentFlight.callsign ? `?callsign=${currentFlight.callsign}` : "";
    fetch(`/api/flights/${currentFlight.icao24}/detail${qs}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setDetail(data))
      .catch(() => {});

    return () => controller.abort();
  }, [selectedIcao]); // only re-fetch when selection changes, not on every position update

  const selected: SelectedFlight | null = currentFlight
    ? { flight: currentFlight, track, detail }
    : null;

  return (
    <FlightSelectionContext value={{ selected, select, deselect }}>
      {children}
    </FlightSelectionContext>
  );
}

export function useFlightSelection() {
  const ctx = useContext(FlightSelectionContext);
  if (!ctx) throw new Error("useFlightSelection must be used within FlightSelectionProvider");
  return ctx;
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/flights/flight-context.tsx
git commit -m "feat: add flight selection context with track/detail fetching"
```

---

### Task 5: Floating detail card

**Files:**
- Create: `frontend/src/modules/flights/flight-detail-card.tsx`

**Step 1: Build the card component**

```tsx
import { X } from "lucide-react";
import { useFlightSelection } from "./flight-context";

export function FlightDetailCard() {
  const { selected, deselect } = useFlightSelection();
  if (!selected) return null;

  const { flight, detail } = selected;
  const aircraft = detail?.aircraft;
  const route = detail?.route;
  const photoUrl = `https://hexdb.io/hex-image-thumb?hex=${flight.icao24}`;

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-in slide-in-from-right duration-300">
      <div className="rounded-xl border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={deselect}
          className="absolute top-3 right-3 z-10 rounded-md p-1 text-muted hover:text-foreground hover:bg-panel-hover transition-colors"
        >
          <X size={16} />
        </button>

        {/* Aircraft photo */}
        <img
          src={photoUrl}
          alt=""
          className="w-full h-[160px] object-cover bg-surface"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-semibold text-accent">
                {flight.callsign || flight.icao24}
              </span>
              {aircraft?.registration && (
                <span className="text-xs text-muted">{aircraft.registration}</span>
              )}
            </div>
            {aircraft && (
              <p className="text-sm text-muted mt-0.5">
                {[aircraft.manufacturer, aircraft.icaoType].filter(Boolean).join(" ") || aircraft.type}
                {aircraft.operator && <span> &middot; {aircraft.operator}</span>}
              </p>
            )}
          </div>

          {/* Route */}
          {route && (route.origin || route.destination) && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-muted/60">Route</div>
              <div className="flex items-center gap-3 text-sm">
                <div className="text-right flex-1">
                  <div className="font-semibold text-foreground">{route.origin?.icao ?? "—"}</div>
                  <div className="text-xs text-muted truncate">{route.origin?.name}</div>
                </div>
                <div className="text-muted/40">→</div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{route.destination?.icao ?? "—"}</div>
                  <div className="text-xs text-muted truncate">{route.destination?.name}</div>
                </div>
              </div>
            </div>
          )}

          {/* Flight data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">Flight Data</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Altitude" value={flight.baro_altitude != null ? `${Math.round(flight.baro_altitude * 3.281).toLocaleString()} ft` : "—"} />
              <Row label="Speed" value={flight.velocity != null ? `${Math.round(flight.velocity * 1.944)} kts` : "—"} />
              <Row label="Heading" value={flight.true_track != null ? `${Math.round(flight.true_track)}°` : "—"} />
              <Row label="Country" value={flight.origin_country} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/flights/flight-detail-card.tsx
git commit -m "feat: add flight detail floating card component"
```

---

### Task 6: Update FlightsLayer — click handler, flight path, airport markers, camera lock

**Files:**
- Modify: `frontend/src/modules/flights/flights-layer.tsx`

**Step 1: Rewrite FlightsLayer to integrate selection**

The layer now:
- Adds click handler on the flights symbol layer
- Renders a flight path line layer when a track is loaded
- Renders airport markers when route airports have coords
- Locks camera to follow the selected plane on each poll update
- Sets cursor to pointer on hover

```tsx
import { useCallback, useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useFlights } from "./use-flights";
import { useFlightSelection } from "./flight-context";
import type { Flight, FlightTrack } from "@/types/flights";
import type { SelectedFlight } from "@/types/flights";
import type { MapLayerMouseEvent } from "maplibre-gl";

const ICON_ID = "plane-icon";
const ICON_SIZE = 24;

// (keep existing createPlaneIcon and toGeoJSON unchanged)

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

export function FlightsLayer() {
  const { current: mapRef } = useMap();
  const flights = useFlights();
  const { selected, select, deselect } = useFlightSelection();

  // Register plane icon
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    if (!map.hasImage(ICON_ID)) {
      map.addImage(ICON_ID, createPlaneIcon(), { sdf: false });
    }
  }, [mapRef]);

  // Click handler — select a flight
  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const icao24 = feature.properties?.icao24;
      const flight = flights.find((f) => f.icao24 === icao24);
      if (flight) {
        select(flight);
        mapRef?.flyTo({
          center: [flight.longitude, flight.latitude],
          zoom: Math.max(mapRef.getZoom(), 6),
          duration: 1500,
        });
      }
    },
    [flights, select, mapRef]
  );

  // Click on map background → deselect
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleMapClick = (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["flights-layer"] });
      if (!features.length && selected) {
        deselect();
      }
    };

    map.on("click", handleMapClick);
    return () => { map.off("click", handleMapClick); };
  }, [mapRef, selected, deselect]);

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

  // Camera lock — follow selected plane
  useEffect(() => {
    if (!selected || !mapRef) return;
    mapRef.easeTo({
      center: [selected.flight.longitude, selected.flight.latitude],
      duration: 1000,
    });
  }, [selected?.flight.longitude, selected?.flight.latitude, mapRef]);

  const geojson = useMemo(() => toGeoJSON(flights), [flights]);
  const trackGeoJSON = useMemo(
    () => (selected?.track ? trackToGeoJSON(selected.track) : null),
    [selected?.track]
  );
  const airportGeoJSON = useMemo(
    () => (selected ? airportsToGeoJSON(selected) : null),
    [selected?.detail?.route]
  );

  return (
    <>
      {/* Flight path line */}
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

      {/* Airport markers */}
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
              "text-font": ["Open Sans Regular"],
            }}
            paint={{
              "text-color": "#e2e8f0",
              "text-halo-color": "#0f1520",
              "text-halo-width": 1,
            }}
          />
        </Source>
      )}

      {/* Plane icons */}
      <Source id="flights-source" type="geojson" data={geojson}>
        <Layer
          id="flights-layer"
          type="symbol"
          layout={{
            "icon-image": ICON_ID,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.3, 5, 0.6, 8, 1, 12, 1.8],
            "icon-rotate": ["get", "true_track"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          onClick={handleClick}
        />
      </Source>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/flights/flights-layer.tsx
git commit -m "feat: add flight click selection, path line, airport markers, camera lock"
```

---

### Task 7: Wire everything together in FlightsLayer definition

**Files:**
- Modify: `frontend/src/modules/flights/definition.ts`
- Modify: `frontend/src/modules/flights/flights-layer.tsx` (wrap with provider)

**Step 1: Create a wrapper component that provides the context**

In `flights-layer.tsx`, add a wrapper export that wraps the layer + card in the provider:

```tsx
// At end of flights-layer.tsx
import { FlightSelectionProvider } from "./flight-context";
import { FlightDetailCard } from "./flight-detail-card";

export function FlightsModule() {
  const flights = useFlights();
  return (
    <FlightSelectionProvider flights={flights}>
      <FlightsLayerInner flights={flights} />
      <FlightDetailCard />
    </FlightSelectionProvider>
  );
}
```

Rename the current `FlightsLayer` to `FlightsLayerInner` and accept `flights` as a prop instead of calling `useFlights()` directly (to avoid double-fetching). Update `definition.ts` to use `FlightsModule` as the `MapLayer`.

**Step 2: Update definition.ts**

```typescript
import { FlightsModule } from "./flights-layer";

export const flightsModule: ModuleDefinition = {
  id: "flights",
  name: "Flights",
  icon: Plane,
  MapLayer: FlightsModule,
};
```

**Step 3: Verify everything works**

Run: `cd frontend && npm run dev`
Test: Click a plane → card appears, path renders, camera follows. Click away → deselects.

**Step 4: Commit**

```bash
git add frontend/src/modules/flights/flights-layer.tsx frontend/src/modules/flights/definition.ts
git commit -m "feat: wire flight selection provider, detail card, and updated module entry"
```

---

### Task 8: Add slide-in animation CSS

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: Add the animation keyframe and utility class**

```css
@keyframes slide-in-from-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-in.slide-in-from-right {
  animation: slide-in-from-right 0.3s ease-out;
}
```

**Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add slide-in animation for flight detail card"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Types | `types/flights.ts` |
| 2 | Backend track endpoint | `routers/flights.py` |
| 3 | Backend detail endpoint | `routers/flights.py` |
| 4 | Selection context | `flight-context.tsx` (new) |
| 5 | Detail card UI | `flight-detail-card.tsx` (new) |
| 6 | Layer click/path/airports/lock | `flights-layer.tsx` |
| 7 | Wire together | `flights-layer.tsx` + `definition.ts` |
| 8 | Animation CSS | `index.css` |
