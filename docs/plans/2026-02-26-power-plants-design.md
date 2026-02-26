# Power Plants Module Design

## Data Source

WRI Global Power Plant Database v1.3.0 — 34,936 plants across 167 countries, CC BY 4.0.

- URL: `https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv`
- Static CSV, fetched and cached by backend (24h TTL)
- Frozen at 2021; swap source later if a better open API emerges

## Type Definition

```typescript
export interface PowerPlant {
  id: string;           // gppd_idnr
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;  // ISO alpha-3
  fuelType: string;     // Coal, Gas, Oil, Hydro, Solar, Wind, Nuclear, Geothermal, Biomass, Waste
  capacityMw: number;
  owner: string | null;
  commissioningYear: number | null;
}

export interface SelectedPowerPlant {
  plant: PowerPlant;
}
```

## Status Variants (by fuel type)

| Fuel | Key | Dot Color | Rationale |
|---|---|---|---|
| Coal | `coal` | `#6b7280` (gray) | Legacy fossil |
| Gas | `gas` | `#f59e0b` (amber) | Fossil |
| Oil | `oil` | `#78716c` (stone) | Fossil |
| Hydro | `hydro` | `#3b82f6` (blue) | Water |
| Solar | `solar` | `#eab308` (yellow) | Sun |
| Wind | `wind` | `#06b6d4` (cyan) | Air |
| Nuclear | `nuclear` | `#a855f7` (purple) | Matches existing nuclear module |
| Geothermal | `geothermal` | `#ef4444` (red) | Heat |
| Biomass | `biomass` | `#22c55e` (green) | Organic |
| Waste | `waste` | `#a3a3a3` (neutral) | Residual |

## Backend

`backend/app/routers/power_plants.py`

- Route: `GET /api/power-plants`
- Fetch CSV from GitHub raw URL
- Parse with Python `csv` module (no pandas)
- Filter rows missing lat/lng
- Map CSV columns to lean schema
- Cache TTL: 86,400s (24h)
- Graceful fallback to stale cache on failure

## Frontend File Structure

```
frontend/src/types/power-plants.ts
frontend/src/modules/power-plants/
  definition.ts
  use-power-plants.ts
  power-plant-context.tsx
  power-plants-layer.tsx
  power-plant-detail-card.tsx
```

## Module Definition

- `id: "power-plants"`
- `name: "Power Plants"`
- `category: "Infrastructure"`
- `icon: Zap` (lucide-react)
- `focusZoom: 14`

## Data Hook

- `usePowerPlants()` returns `PowerPlant[] | null`
- Poll interval: 1 hour (static data)
- Endpoint: `/api/power-plants`

## Layer Rendering

Standard pin pattern (same as nuclear). 35k points rendered as MapLibre symbol layer with `icon-allow-overlap: true`. Color-coded by fuel type via status variants. Pin images: `power-plants-pin-coal`, `power-plants-pin-solar`, etc.

- `PowerPlantsLayer` (outer): data fetch, count registration
- `PowerPlantsLayerInner`: GeoJSON conversion, pin registration, click/deselect/cursor handlers

## Detail Card

340px card, top-right, `animate-slide-in-right`. Fuel-type-colored banner gradient with Zap icon. Sections:

- Plant name + country
- Plant Details: Fuel type, Capacity (MW), Owner, Commissioning year
- LocationFooter
- Source: "WRI Global Power Plant Database"

## Time Filter

Not applicable — power plants have `commissioningYear` not event timestamps. No `filterByTime` integration.

## Supporting Changes

- `frontend/src/modules/registry.ts` — add to MODULE_REGISTRY
- `frontend/src/modules/focus-zoom.ts` — add `"power-plants": 14`
- `backend/app/main.py` — register router with `/api` prefix
