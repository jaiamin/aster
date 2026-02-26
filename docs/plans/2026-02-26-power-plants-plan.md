# Power Plants Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Power Plants data layer showing ~35,000 global power plants color-coded by fuel type.

**Architecture:** Backend fetches WRI Global Power Plant Database CSV from GitHub, parses and caches 24h. Frontend renders as MapLibre symbol layer with fuel-type-colored pins following the exact nuclear module pattern.

**Tech Stack:** FastAPI + httpx (backend), React + MapLibre GL + @vis.gl/react-maplibre (frontend)

---

### Task 1: Backend Router

**Files:**
- Create: `backend/app/routers/power_plants.py`
- Modify: `backend/app/main.py`

**Step 1: Create the backend router**

Create `backend/app/routers/power_plants.py`:

```python
import csv
import io
import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 86400.0  # 24 hours — data is essentially static


def _normalize_fuel(raw: str) -> str:
    mapping = {
        "Petro": "Oil",
        "Cogeneration": "Gas",
        "Storage": "Other",
        "Wave and Tidal": "Hydro",
    }
    return mapping.get(raw, raw)


@router.get("/power-plants")
async def get_power_plants():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.get(DATA_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=e.response.status_code, detail="WRI data error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to fetch power plant data")

    reader = csv.DictReader(io.StringIO(resp.text))
    results = []
    for row in reader:
        try:
            lat = float(row["latitude"])
            lng = float(row["longitude"])
        except (ValueError, KeyError):
            continue

        cap_raw = row.get("capacity_mw", "")
        try:
            capacity = round(float(cap_raw), 1)
        except ValueError:
            capacity = 0

        year_raw = row.get("commissioning_year", "")
        try:
            year = int(float(year_raw))
        except ValueError:
            year = None

        results.append({
            "id": row.get("gppd_idnr", ""),
            "name": row.get("name", "Unknown"),
            "latitude": lat,
            "longitude": lng,
            "country": row.get("country_long", ""),
            "countryCode": row.get("country", ""),
            "fuelType": _normalize_fuel(row.get("primary_fuel", "Other")),
            "capacityMw": capacity,
            "owner": row.get("owner") or None,
            "commissioningYear": year,
        })

    _cache = results
    _cache_time = now
    return results
```

**Step 2: Register the router in main.py**

In `backend/app/main.py`, add to the imports:

```python
from app.routers import air_quality, airports, buoys, cables, earthquakes, flights, health, launches, map_config, nuclear, ports, power_plants, satellites, ships, storms, volcanoes, wildfires
```

Add after the storms router line:

```python
app.include_router(power_plants.router, prefix="/api")
```

**Step 3: Verify the backend**

Run: `cd backend && python -c "from app.routers import power_plants; print('import ok')"`
Expected: `import ok`

**Step 4: Commit**

```
feat: add power plants backend router

Fetches WRI Global Power Plant Database CSV, parses ~35k plants,
caches 24h. Normalizes fuel types and filters missing coordinates.
```

---

### Task 2: Frontend Type Definition

**Files:**
- Create: `frontend/src/types/power-plants.ts`

**Step 1: Create the type file**

Create `frontend/src/types/power-plants.ts`:

```typescript
export interface PowerPlant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  fuelType: string;
  capacityMw: number;
  owner: string | null;
  commissioningYear: number | null;
}

export interface SelectedPowerPlant {
  plant: PowerPlant;
}
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compile

**Step 3: Commit**

```
feat: add PowerPlant type definition
```

---

### Task 3: Data Hook

**Files:**
- Create: `frontend/src/modules/power-plants/use-power-plants.ts`

**Step 1: Create the hook**

Create `frontend/src/modules/power-plants/use-power-plants.ts`:

```typescript
import { useEffect, useState } from "react";
import type { PowerPlant } from "@/types/power-plants";

const POLL_INTERVAL = 3_600_000; // 1 hour — static data

export function usePowerPlants() {
  const [plants, setPlants] = useState<PowerPlant[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPlants() {
      try {
        const res = await fetch("/api/power-plants", { signal: controller.signal });
        if (!res.ok) return;
        const data: PowerPlant[] = await res.json();
        setPlants(data);
      } catch {
        // aborted or network error
      }
    }

    fetchPlants();
    const id = setInterval(fetchPlants, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return plants;
}
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compile

**Step 3: Commit**

```
feat: add usePowerPlants data hook
```

---

### Task 4: Selection Context

**Files:**
- Create: `frontend/src/modules/power-plants/power-plant-context.tsx`

**Step 1: Create the context**

Create `frontend/src/modules/power-plants/power-plant-context.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PowerPlant, SelectedPowerPlant } from "@/types/power-plants";
import { useModules } from "@/modules/module-context";

interface PowerPlantSelectionContextValue {
  selected: SelectedPowerPlant | null;
  select: (plant: PowerPlant) => void;
  deselect: () => void;
}

const PowerPlantSelectionContext = createContext<PowerPlantSelectionContextValue | null>(null);

export function PowerPlantSelectionProvider({ children }: { children: React.ReactNode }) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModules();
  const [selected, setSelected] = useState<SelectedPowerPlant | null>(null);

  const select = useCallback((plant: PowerPlant) => {
    notifySelected("power-plants");
    setSelected({ plant });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("power-plants", deselect);
    return () => unregisterDeselect("power-plants");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <PowerPlantSelectionContext value={{ selected, select, deselect }}>
      {children}
    </PowerPlantSelectionContext>
  );
}

export function usePowerPlantSelection() {
  const ctx = useContext(PowerPlantSelectionContext);
  if (!ctx) throw new Error("usePowerPlantSelection must be used within PowerPlantSelectionProvider");
  return ctx;
}
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compile

**Step 3: Commit**

```
feat: add PowerPlantSelectionProvider context
```

---

### Task 5: Detail Card

**Files:**
- Create: `frontend/src/modules/power-plants/power-plant-detail-card.tsx`

**Step 1: Create the detail card**

Create `frontend/src/modules/power-plants/power-plant-detail-card.tsx`:

```tsx
import { Zap, LocateFixed, X } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { usePowerPlantSelection } from "./power-plant-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

function fuelColor(fuel: string): string {
  switch (fuel) {
    case "Coal": return "#6b7280";
    case "Gas": return "#f59e0b";
    case "Oil": return "#78716c";
    case "Hydro": return "#3b82f6";
    case "Solar": return "#eab308";
    case "Wind": return "#06b6d4";
    case "Nuclear": return "#a855f7";
    case "Geothermal": return "#ef4444";
    case "Biomass": return "#22c55e";
    case "Waste": return "#a3a3a3";
    default: return "#6b7280";
  }
}

export function PowerPlantDetailCard() {
  const { selected, deselect } = usePowerPlantSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { plant } = selected;
  const color = fuelColor(plant.fuelType);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [plant.longitude, plant.latitude],
      zoom: FOCUS_ZOOM["power-plants"],
      duration: 1500,
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <div
            className="w-full h-[140px] flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <Zap size={48} strokeWidth={1.5} style={{ color }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
              style={{ color, borderColor: color, border: "1px solid" }}
            >
              {plant.fuelType}
            </span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = color)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              title="Recenter"
            >
              <LocateFixed size={16} />
            </button>
            <button
              onClick={deselect}
              className="p-1 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <button
              onClick={recenter}
              className="text-lg font-semibold transition-colors"
              style={{ color }}
            >
              {plant.name}
            </button>
            <p className="text-xs text-muted mt-0.5">{plant.country}</p>
          </div>

          {/* Plant Details */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Plant Details
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Fuel" value={plant.fuelType} />
              <Row label="Capacity" value={`${plant.capacityMw} MW`} />
              {plant.owner && <Row label="Owner" value={plant.owner} />}
              {plant.commissioningYear != null && (
                <Row label="Commissioned" value={String(plant.commissioningYear)} />
              )}
            </div>
          </div>

          <LocationFooter latitude={plant.latitude} longitude={plant.longitude} />

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              WRI Global Power Plant Database
            </span>
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
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compile

**Step 3: Commit**

```
feat: add PowerPlantDetailCard
```

---

### Task 6: Map Layer

**Files:**
- Create: `frontend/src/modules/power-plants/power-plants-layer.tsx`

**Step 1: Create the layer component**

Create `frontend/src/modules/power-plants/power-plants-layer.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Zap } from "lucide-react";
import { usePowerPlants } from "./use-power-plants";
import { PowerPlantSelectionProvider, usePowerPlantSelection } from "./power-plant-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { PowerPlantDetailCard } from "./power-plant-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { PowerPlant } from "@/types/power-plants";

const MODULE_ID = "power-plants";

const STATUS_VARIANTS = [
  { key: "coal", dotColor: "#6b7280" },
  { key: "gas", dotColor: "#f59e0b" },
  { key: "oil", dotColor: "#78716c" },
  { key: "hydro", dotColor: "#3b82f6" },
  { key: "solar", dotColor: "#eab308" },
  { key: "wind", dotColor: "#06b6d4" },
  { key: "nuclear", dotColor: "#a855f7" },
  { key: "geothermal", dotColor: "#ef4444" },
  { key: "biomass", dotColor: "#22c55e" },
  { key: "waste", dotColor: "#a3a3a3" },
  { key: "other", dotColor: "#6b7280" },
];

function fuelToStatusKey(fuel: string): string {
  const key = fuel.toLowerCase();
  if (STATUS_VARIANTS.some((v) => v.key === key)) return key;
  return "other";
}

function toGeoJSON(plants: PowerPlant[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: plants.map((p) => {
      const key = fuelToStatusKey(p.fuelType);
      const sel = p.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function PowerPlantsLayerInner({ plants }: { plants: PowerPlant[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = usePowerPlantSelection();
  const plantsRef = useRef(plants);
  plantsRef.current = plants;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.plant.id ?? null;
  const geojson = useMemo(() => toGeoJSON(plants, selectedId), [plants, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = {
      moduleId: MODULE_ID,
      icon: Zap,
      bgColor: CATEGORY_COLORS.Infrastructure,
      statusVariants: STATUS_VARIANTS,
    };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const plant = plantsRef.current.find((p) => p.id === id);
      if (plant) {
        select(plant);
        map.flyTo({
          center: [plant.longitude, plant.latitude],
          zoom: FOCUS_ZOOM["power-plants"],
          duration: 1500,
        });
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
  );
}

export function PowerPlantsLayer() {
  const plants = usePowerPlants();
  useModuleCount("power-plants", plants?.length ?? null);
  return (
    <PowerPlantSelectionProvider>
      <PowerPlantsLayerInner plants={plants ?? []} />
      <PowerPlantDetailCard />
    </PowerPlantSelectionProvider>
  );
}
```

**Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compile

**Step 3: Commit**

```
feat: add PowerPlantsLayer map component
```

---

### Task 7: Module Definition & Registration

**Files:**
- Create: `frontend/src/modules/power-plants/definition.ts`
- Modify: `frontend/src/modules/registry.ts`
- Modify: `frontend/src/modules/focus-zoom.ts`

**Step 1: Create the definition**

Create `frontend/src/modules/power-plants/definition.ts`:

```typescript
import { Zap } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { PowerPlantsLayer } from "./power-plants-layer";

export const powerPlantsModule: ModuleDefinition = {
  id: "power-plants",
  name: "Power Plants",
  category: "Infrastructure",
  icon: Zap,
  focusZoom: FOCUS_ZOOM["power-plants"],
  MapLayer: PowerPlantsLayer,
};
```

**Step 2: Add focus zoom entry**

In `frontend/src/modules/focus-zoom.ts`, add:

```
"power-plants": 14,
```

after the `nuclear: 14,` line.

**Step 3: Register in registry**

In `frontend/src/modules/registry.ts`:

Add import:
```typescript
import { powerPlantsModule } from "./power-plants/definition";
```

Add to `MODULE_REGISTRY` array after `nuclearModule`:
```typescript
powerPlantsModule,
```

**Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compile

**Step 5: Commit**

```
feat: register power plants module

Adds power-plants to registry, focus-zoom, and module definition.
This completes the power plants data layer.
```

---

### Task 8: Full Integration Verification

**Step 1: TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean compile, zero errors

**Step 2: Backend check**

Run: `cd backend && python -c "from app.main import app; print('ok')"`
Expected: `ok`

**Step 3: Dev server smoke test**

Run: `cd frontend && npm run dev`
Verify:
- Open sidebar → Data Layers → Infrastructure category
- "Power Plants" appears alongside "Nuclear Facilities"
- Toggle Power Plants on → ~35k pins load, color-coded by fuel type
- Click a pin → detail card slides in from right with plant info
- Close detail card → deselects cleanly
- Verify count in sidebar shows total

**Step 4: Final commit (if any fixes needed)**

```
fix: power plants integration adjustments
```
