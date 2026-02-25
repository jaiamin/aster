# Flight Detail & Tracking

## Data Flow

Click a plane → 3 parallel requests through backend:

1. **`GET /api/flights/{icao24}/track`** — proxy OpenSky `/tracks?icao24=X&time=0` → waypoints for flight path line
2. **`GET /api/flights/{icao24}/detail`** — proxy hexdb.io aircraft lookup + route lookup + airport lookups → aircraft info, route, airport names/coords
3. **Aircraft photo** — `https://hexdb.io/hex-image-thumb?hex={icao24}` loaded directly in `<img>` (public CDN)

### Backend Endpoints

**`GET /api/flights/{icao24}/track`**
- Proxies OpenSky `/tracks?icao24={icao24}&time=0`
- Returns `{ path: [{ time, latitude, longitude, altitude, heading, on_ground }], startTime, endTime }`
- Cache per icao24 with short TTL (~30s)

**`GET /api/flights/{icao24}/detail?callsign={callsign}`**
- Calls hexdb.io in parallel:
  - `/api/v1/aircraft/{icao24}` → registration, type, manufacturer, operator
  - `/api/v1/route/icao/{callsign}` → origin/destination airport ICAO codes
  - `/api/v1/airport/icao/{code}` for each airport → name, lat/lng
- Returns combined response with aircraft + route + airport data
- Cache per icao24 with longer TTL (~5min, aircraft details are static)

## Map Behavior

- Click plane → fly-to animation centering on plane, zoom ~6-7
- Camera locks to follow plane on each poll update (re-center smoothly)
- Flight path: `line` layer from track waypoints, styled with accent color
- Airport markers: circle + ICAO label at origin/destination
- Deselect: click away or close button → remove path/markers, unlock camera

## Floating Card (top-right)

- ~350px wide, auto height, top-right with 16px margin
- Slide-in animation from right
- Backdrop-blur glass effect matching dark theme
- Dismissible via X button or clicking the map

Layout:
- Aircraft photo (hexdb thumbnail, hidden if 404)
- Callsign + Registration
- Aircraft type + Operator
- Route section: origin airport → destination airport (ICAO + name)
- Flight data section: altitude, speed, heading, country (live-updating)

## Files to Create/Modify

### Backend
- `backend/app/routers/flights.py` — add `/{icao24}/track` and `/{icao24}/detail` endpoints

### Frontend (new)
- `frontend/src/modules/flights/use-flight-detail.ts` — hook: fetch track + detail on selection
- `frontend/src/modules/flights/flight-detail-card.tsx` — floating card component

### Frontend (modify)
- `frontend/src/modules/flights/flights-layer.tsx` — click handler, path line layer, airport markers, camera lock
- `frontend/src/types/flights.ts` — add FlightDetail, FlightTrack, Airport types

### Unchanged
- Existing polling, caching, module system
- useFlights hook, globe controls, sidebar, status bar
