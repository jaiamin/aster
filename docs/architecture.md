# Architecture

Aster is a real-time geospatial data visualization platform that aggregates 15+ live data feeds onto an interactive 3D globe.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │           React + MapLibre GL JS                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │
│  │  │ Module  │ │ Module  │ │ Module  │  ...×15     │  │
│  │  │ Layer   │ │ Layer   │ │ Layer   │             │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘            │  │
│  │       └───────────┼───────────┘                  │  │
│  │              usePolledData()                      │  │
│  └──────────────────┬────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTP (polling)
┌─────────────────────┼───────────────────────────────────┐
│                 Nginx (reverse proxy)                    │
│              /api/* → api:8000                           │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│              FastAPI Backend                             │
│  ┌──────────────────┴──────────────────────┐            │
│  │            Router Layer                  │            │
│  │   GET /api/earthquakes                   │            │
│  │   GET /api/flights                       │            │
│  │   GET /api/storms       ...×16           │            │
│  └──────────────────┬──────────────────────┘            │
│  ┌──────────────────┴──────────────────────┐            │
│  │         Service Layer                    │            │
│  │   fetch_and_cache() — shared utility     │            │
│  │   flights.py, storms.py, ports.py        │            │
│  └──────────────────┬──────────────────────┘            │
│  ┌──────────────────┴──────────────────────┐            │
│  │    Background Scheduler                  │            │
│  │    Proactive refresh with staggered      │            │
│  │    intervals (10s–7200s per layer)       │            │
│  └──────────────────┬──────────────────────┘            │
│                     │                                    │
│              ┌──────┴──────┐                            │
│              │ Redis Cache │                             │
│              │ (+ in-mem   │                             │
│              │  fallback)  │                             │
│              └──────┬──────┘                            │
└─────────────────────┼───────────────────────────────────┘
                      │
            External APIs (USGS, FAA, NHC, etc.)
```

## Data Flow

1. **Background scheduler** proactively fetches data from external APIs at staggered intervals
2. Fetched data is transformed and stored in **Redis** (with in-memory fallback)
3. **Frontend polls** `/api/<layer>` endpoints at regular intervals
4. **Routers** return cached data instantly (sub-millisecond) or fetch on cache miss
5. **Frontend modules** render data as map layers via MapLibre GL JS

## Frontend Architecture

```
apps/web/src/
├── components/
│   ├── globe/              # Map rendering (MapLibre)
│   │   └── clustered-pin-source.tsx
│   ├── shell/              # App chrome
│   │   ├── app-shell.tsx   # Layout + module layer mounting
│   │   ├── sidebar.tsx     # Navigation sidebar
│   │   └── explorer/       # Data explorer panel (7 files)
│   └── error-boundary.tsx  # Graceful error handling
├── hooks/
│   ├── use-polled-data.ts  # Core data fetching hook
│   ├── use-module-count.ts # Module item counting
│   └── ...
├── modules/                # One directory per data layer
│   ├── earthquakes/
│   │   ├── use-earthquakes.ts       # Data hook
│   │   ├── earthquakes-layer.tsx    # Map layer component
│   │   ├── earthquake-detail-card.tsx
│   │   └── earthquake-context.tsx
│   ├── flights/
│   ├── storms/
│   └── ... (15 modules)
├── modules/
│   ├── module-context.tsx  # Module toggle/visibility state
│   ├── explorer-context.tsx # Explorer filtering state
│   └── registry.ts        # Module registration
└── types/                  # TypeScript type definitions
```

### Module Pattern

Every data layer follows the same structure:

- **`use-<layer>.ts`** — calls `usePolledData()` with endpoint and interval
- **`<layer>-layer.tsx`** — renders GeoJSON features on the map
- **`<layer>-detail-card.tsx`** — popup card when a feature is selected
- **`<layer>-context.tsx`** — selection state for the layer

Modules are registered in `registry.ts` and mounted by `app-shell.tsx` inside individual `<ErrorBoundary>` + `<Suspense>` wrappers.

## Backend Architecture

```
apps/api/app/
├── main.py              # FastAPI app, lifespan, router mounting
├── config.py            # Pydantic settings (env vars)
├── cache.py             # Redis + in-memory fallback
├── http_client.py       # Shared httpx connection pool
├── scheduler.py         # Background refresh task manager
├── routers/             # Thin HTTP endpoint handlers
│   ├── earthquakes.py   # ~15 lines: endpoint + transform
│   ├── flights.py       # Delegates to services/flights.py
│   ├── storms.py        # Delegates to services/storms.py
│   └── ... (16 routers)
└── services/            # Business logic
    ├── base.py          # fetch_and_cache() + refresh()
    ├── flights.py       # OAuth + state parsing
    ├── storms.py        # Multi-layer NHC aggregation
    └── ports.py         # Port lookup + Nominatim fallback
```

### Service Layer

Most routers are thin (~15 lines) and delegate to `fetch_and_cache()`:

```python
@router.get("/earthquakes")
async def get_earthquakes():
    return await fetch_and_cache("earthquakes", USGS_URL, 300, _transform)
```

Complex layers (flights, storms, ports) have dedicated service modules with additional logic.

### Caching Strategy

- **Redis** is the primary cache with configurable TTLs per layer
- **In-memory dict** serves as automatic fallback when Redis is unavailable
- Cache is **never cleared on failure** — stale data is always preferred over no data
- Background scheduler refreshes data proactively so API requests hit warm cache

### Background Scheduler

| Layer | Refresh | Cache TTL |
|-------|---------|-----------|
| Flights | 10s | 60s |
| Earthquakes | 60s | 300s |
| Storms | 5min | 15min |
| Wildfires | 10min | 30min |
| Volcanoes | 30min | 90min |
| Buoys | 10min | 30min |
| Launches | 10min | 30min |

Static layers (cables, airports, ports, power plants, nuclear) use lazy-fetch with 24hr TTL.

## Infrastructure

- **Nginx** — reverse proxy, static file serving, gzip, security headers
- **Redis** — cache layer with health checks
- **Docker Compose** — orchestrates all services with health checks and restart policies
