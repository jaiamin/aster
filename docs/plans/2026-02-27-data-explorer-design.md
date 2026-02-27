# Data Explorer Panel Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a right-side explorer panel that lets users search, filter, and browse items for any data layer — with filters that affect both the panel list and map pins.

**Approach:** Declarative filter schema. Each module definition declares its filterable fields. A single generic ExplorerPanel component renders controls from the schema. No per-module UI code.

## Filter Schema

Four filter types cover all 14 modules:

```ts
type FilterField =
  | { key: string; label: string; type: "range"; min: number; max: number; unit?: string }
  | { key: string; label: string; type: "enum"; options?: string[] }
  | { key: string; label: string; type: "boolean" }
  | { key: string; label: string; type: "text" }
```

Enum filters with no explicit `options` auto-derive unique values from the current data.

Module definitions gain two new fields:

```ts
export interface ModuleDefinition {
  // ...existing fields...
  filters?: FilterField[];
  listColumns?: { key: string; label: string; width?: string }[];
}
```

## Panel Layout

Opens to the right of the existing sidebar, overlaying the map. Width: 320px (`w-80`). One panel open at a time.

**Sections (top to bottom):**

1. **Header** — Module icon (colored), name, item count + active filter count, close button. `bg-accent` style.
2. **Search bar + filter toggle** — Text input for substring search. Filter button on the right of the search bar that collapses/expands the filter section. Button shows dot badge when filters are active. Filters collapsed by default.
3. **Filter controls** (collapsible) — Rendered from schema: range sliders, enum chip lists, boolean checkboxes.
4. **Active filter chips** — Dismissible chips showing active filters (e.g., `Magnitude: 4.0–8.0 ✕`).
5. **Item list** — Column headers from `listColumns`, virtualized scrollable rows. Click to select on map.
6. **Source footer** — Attribution from module definition, pinned to bottom.

## Filter Definitions Per Module

### Tracking

**Flights:** origin_country (enum), baro_altitude (range 0–50000 ft), velocity (range 0–600 kts)
List: Callsign, Country, Altitude

**Ships:** shipType (enum), speed (range 0–30 kts), navStatus (enum)
List: Name, Type, Speed

**Satellites:** objectType (enum), owner (enum), orbitType (enum, derived from period/inclination/eccentricity)
List: Name, Owner, Type

### Events

**Earthquakes:** magnitude (range 0–10), depth (range 0–700 km), tsunami (boolean), country (enum)
List: Place, Mag, Depth

**Storms:** category (range 0–5), basin (enum), windSpeed (range 0–200 kt)
List: Name, Category, Wind

**Wildfires:** confidence (enum: High/Nominal/Low), frp (range 0–1000 MW), daynight (enum: D/N), country (enum)
List: Location, FRP, Confidence

**Volcanoes:** country (enum)
List: Name, Last Activity

**Launches:** status (enum: Go/TBD/Success/Failure), provider (enum), missionOrbit (enum), country (enum)
List: Name, Status, Provider

### Infrastructure

**Airports:** type (enum: large/medium), country (enum)
List: Name, IATA, Country

**Ports:** country (enum)
List: Name, Country

**Power Plants:** fuelType (enum), capacityMw (range 0–10000 MW), country (enum)
List: Name, Fuel, Capacity

**Cables:** (no filters — line geometry, sparse data)
List: Name

### Environment

**Air Quality:** pm25 (range 0–500), country (enum)
List: Name, PM2.5, AQI

**Buoys:** waveHeight (range 0–15 m), waterTemp (range -2–35 °C), windSpeed (range 0–60 kts)
List: ID, Waves, Wind

## State Management

New `ExplorerContext` added to module-context.tsx:

```ts
interface ExplorerState {
  openModuleId: string | null;
  filters: Map<string, ActiveFilters>;
}

type ActiveFilters = Record<string, FilterValue>;

type FilterValue =
  | { type: "range"; min: number; max: number }
  | { type: "enum"; selected: Set<string> }
  | { type: "boolean"; value: boolean }
  | { type: "text"; value: string }
```

### Data Flow

1. User interacts with panel controls → updates ExplorerContext
2. ExplorerContext provides `useExplorerFilters(moduleId)` hook → returns `(item: T) => boolean`
3. Each map layer calls `items.filter(matchesFilters)` before building GeoJSON
4. Panel list also filters using the same predicate + search query

## Interactions

**Opening/closing:**
- Click layer name in sidebar opens panel. Auto-enables layer if off.
- Click different layer name swaps panel content.
- Close via ✕ or Escape. Filters persist. Dot badge on sidebar row indicates active filters.
- Toggling layer OFF clears its filters and closes panel.

**Filtering:**
- Range: dual-thumb slider, applies on release.
- Enum: chip toggles. Nothing selected = no filter. 1+ selected = only those show.
- Boolean: checkbox. Unchecked = no filter.
- Search: instant, debounced 150ms, substring match across all string fields.
- All filters compose with AND logic. Search is also AND.

**Item list:**
- Click row → select item on map (fly to, open detail card, highlight row).
- Selected item auto-scrolled into view.
- Virtualized for 10,000+ items.
- Sortable columns (click header to toggle asc/desc).

**Map filtering:**
- Filtered-out items removed from GeoJSON (not dimmed). Cluster counts update.
- If selected item is filtered out, deselect and close detail card.

**Empty states:**
- No matches → "No items match current filters" + clear button.
- Loading → skeleton rows.
- No filters defined → search + list only, no filter button.

## Backend: Country Reverse Geocoding

Shared utility `country_from_coords(lat, lng)` using Natural Earth simplified boundaries (~500KB GeoJSON). Applied once at cache time for: earthquakes, wildfires, volcanoes, launches.

Falls back to `None` for ocean coordinates.
