# Data Explorer Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a declarative filter/explorer panel that lets users search, filter, and browse items for any data layer, with filters affecting both the panel list and map pins.

**Architecture:** Each module definition declares a filter schema (`filters`, `listColumns`). A new `ExplorerContext` stores per-module filter state. A generic `ExplorerPanel` component reads the schema and renders controls. Each map layer applies filters via a `useExplorerFilters` hook before building GeoJSON. A data registry lets layers publish their item arrays so the panel can list them.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, @tanstack/react-virtual for list virtualization

---

### Task 1: Install @tanstack/react-virtual

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install the dependency**

```bash
cd frontend && npm install @tanstack/react-virtual
```

**Step 2: Verify build**

```bash
cd frontend && npx vite build
```

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add @tanstack/react-virtual for explorer panel"
```

---

### Task 2: Extend ModuleDefinition with filter schema types

**Files:**
- Modify: `frontend/src/types/modules.ts`

**Step 1: Add FilterField type and extend ModuleDefinition**

Replace the full contents of `frontend/src/types/modules.ts` with:

```ts
import type { ComponentType, LucideIcon } from "lucide-react";

export type FilterField =
  | { key: string; label: string; type: "range"; min: number; max: number; unit?: string }
  | { key: string; label: string; type: "enum"; options?: string[] }
  | { key: string; label: string; type: "boolean" }
  | { key: string; label: string; type: "text" };

export interface ListColumn {
  key: string;
  label: string;
  width?: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  /** Zoom level when focusing on a selected item */
  focusZoom: number;
  MapLayer: ComponentType;
  source?: { name: string; url?: string };
  filters?: FilterField[];
  listColumns?: ListColumn[];
  /** Key used to extract a display name from each item for search/list */
  nameKey?: string;
}
```

`nameKey` tells the explorer which field to use as the primary display name in the item list (e.g., `"place"` for earthquakes, `"name"` for most modules). Defaults to `"name"` if omitted.

**Step 2: Verify build**

```bash
cd frontend && npx vite build
```

**Step 3: Commit**

```bash
git add frontend/src/types/modules.ts
git commit -m "feat: add FilterField and ListColumn types to ModuleDefinition"
```

---

### Task 3: Add filter definitions to all 14 module definitions

**Files:**
- Modify: all 14 `frontend/src/modules/*/definition.ts` files

**Step 1: Add filters, listColumns, and nameKey to each definition**

For each module, add the fields to the existing `ModuleDefinition` object. Import `FilterField` and `ListColumn` are NOT needed — the types are checked structurally.

**flights/definition.ts** — add after `source`:
```ts
  nameKey: "callsign",
  filters: [
    { key: "origin_country", label: "Country", type: "enum" },
    { key: "baro_altitude", label: "Altitude", type: "range", min: 0, max: 50000, unit: "ft" },
    { key: "velocity", label: "Speed", type: "range", min: 0, max: 600, unit: "kts" },
  ],
  listColumns: [
    { key: "callsign", label: "Callsign" },
    { key: "origin_country", label: "Country" },
    { key: "baro_altitude", label: "Alt (ft)", width: "72px" },
  ],
```

**satellites/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "OBJECT_TYPE", label: "Type", type: "enum" },
    { key: "owner", label: "Owner", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "owner", label: "Owner" },
    { key: "OBJECT_TYPE", label: "Type", width: "72px" },
  ],
```

Note: Satellites use position data merged with GP records. The explorer will list positions (which have `name` and `id`). `owner` and `OBJECT_TYPE` come from SATCAT/GP data respectively — we will handle the join in the layer when registering data. For now, declare the schema. If some fields are missing from the registered items, the filter simply won't match and shows "—" in the list.

**ships/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "shipType", label: "Ship Type", type: "enum" },
    { key: "speed", label: "Speed", type: "range", min: 0, max: 30, unit: "kts" },
    { key: "navStatus", label: "Status", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "shipType", label: "Type", width: "64px" },
    { key: "speed", label: "Speed", width: "56px" },
  ],
```

**earthquakes/definition.ts** — add after `source`:
```ts
  nameKey: "place",
  filters: [
    { key: "magnitude", label: "Magnitude", type: "range", min: 0, max: 10 },
    { key: "depth", label: "Depth", type: "range", min: 0, max: 700, unit: "km" },
    { key: "tsunami", label: "Tsunami", type: "boolean" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "place", label: "Location" },
    { key: "magnitude", label: "Mag", width: "48px" },
    { key: "depth", label: "Depth", width: "64px" },
  ],
```

**storms/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "category", label: "Category", type: "range", min: 0, max: 5 },
    { key: "basin", label: "Basin", type: "enum" },
    { key: "windSpeed", label: "Wind Speed", type: "range", min: 0, max: 200, unit: "kt" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "category", label: "Cat", width: "40px" },
    { key: "windSpeed", label: "Wind", width: "56px" },
  ],
```

**wildfires/definition.ts** — add after `source`:
```ts
  nameKey: "latitude",
  filters: [
    { key: "confidence", label: "Confidence", type: "enum" },
    { key: "frp", label: "FRP", type: "range", min: 0, max: 1000, unit: "MW" },
    { key: "daynight", label: "Day/Night", type: "enum", options: ["D", "N"] },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "country", label: "Country" },
    { key: "frp", label: "FRP (MW)", width: "72px" },
    { key: "confidence", label: "Conf", width: "56px" },
  ],
```

**volcanoes/definition.ts** — add after `source`:
```ts
  nameKey: "title",
  filters: [
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "title", label: "Name" },
    { key: "country", label: "Country" },
  ],
```

**launches/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "status", label: "Status", type: "enum" },
    { key: "provider", label: "Provider", type: "enum" },
    { key: "missionOrbit", label: "Orbit", type: "enum" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "status", label: "Status", width: "56px" },
    { key: "provider", label: "Provider", width: "80px" },
  ],
```

**airports/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "type", label: "Type", type: "enum" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "iata", label: "IATA", width: "48px" },
    { key: "country", label: "Country", width: "56px" },
  ],
```

**ports/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "country", label: "Country" },
  ],
```

**power-plants/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "fuelType", label: "Fuel Type", type: "enum" },
    { key: "capacityMw", label: "Capacity", type: "range", min: 0, max: 10000, unit: "MW" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "fuelType", label: "Fuel", width: "64px" },
    { key: "capacityMw", label: "MW", width: "56px" },
  ],
```

**air-quality/definition.ts** — add after `source`:
```ts
  filters: [
    { key: "pm25", label: "PM2.5", type: "range", min: 0, max: 500 },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Station" },
    { key: "pm25", label: "PM2.5", width: "56px" },
    { key: "country", label: "Country", width: "64px" },
  ],
```

**buoys/definition.ts** — add after `source`:
```ts
  nameKey: "id",
  filters: [
    { key: "waveHeight", label: "Wave Height", type: "range", min: 0, max: 15, unit: "m" },
    { key: "waterTemp", label: "Water Temp", type: "range", min: -2, max: 35, unit: "°C" },
    { key: "windSpeed", label: "Wind Speed", type: "range", min: 0, max: 60, unit: "kts" },
  ],
  listColumns: [
    { key: "id", label: "Buoy ID" },
    { key: "waveHeight", label: "Waves (m)", width: "72px" },
    { key: "windSpeed", label: "Wind", width: "56px" },
  ],
```

**cables/definition.ts** — add after `source`:
```ts
  nameKey: "name",
  listColumns: [
    { key: "name", label: "Name" },
  ],
```

No filters for cables (line geometry, sparse data).

**Step 2: Verify build**

```bash
cd frontend && npx vite build
```

**Step 3: Commit**

```bash
git add frontend/src/modules/*/definition.ts
git commit -m "feat: add filter schemas and list columns to all module definitions"
```

---

### Task 4: Create ExplorerContext with data registry, filter state, and useExplorerFilters hook

**Files:**
- Create: `frontend/src/modules/explorer-context.tsx`
- Create: `frontend/src/hooks/use-module-data.ts`
- Modify: `frontend/src/modules/module-context.tsx` (wrap with ExplorerProvider)

**Step 1: Create `frontend/src/modules/explorer-context.tsx`**

```tsx
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { MODULE_REGISTRY } from "@/modules/registry";

// ── Types ──────────────────────────────────────────────────────────────────

export type FilterValue =
  | { type: "range"; min: number; max: number }
  | { type: "enum"; selected: Set<string> }
  | { type: "boolean"; value: boolean }
  | { type: "text"; value: string };

export type ActiveFilters = Record<string, FilterValue>;

interface ExplorerContextValue {
  // Panel state
  openModuleId: string | null;
  openExplorer: (moduleId: string) => void;
  closeExplorer: () => void;

  // Per-module filter state
  getFilters: (moduleId: string) => ActiveFilters;
  setFilter: (moduleId: string, key: string, value: FilterValue | null) => void;
  clearFilters: (moduleId: string) => void;
  hasActiveFilters: (moduleId: string) => boolean;

  // Search (per-module)
  getSearch: (moduleId: string) => string;
  setSearch: (moduleId: string, query: string) => void;

  // Data registry
  moduleData: Map<string, any[]>;
  registerData: (moduleId: string, data: any[]) => void;
  unregisterData: (moduleId: string) => void;
}

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function ExplorerProvider({ children }: { children: ReactNode }) {
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [allFilters, setAllFilters] = useState<Map<string, ActiveFilters>>(new Map());
  const [allSearch, setAllSearch] = useState<Map<string, string>>(new Map());
  const [moduleData, setModuleData] = useState<Map<string, any[]>>(new Map());

  const openExplorer = useCallback((moduleId: string) => setOpenModuleId(moduleId), []);
  const closeExplorer = useCallback(() => setOpenModuleId(null), []);

  const getFilters = useCallback(
    (moduleId: string): ActiveFilters => allFilters.get(moduleId) ?? {},
    [allFilters],
  );

  const setFilter = useCallback((moduleId: string, key: string, value: FilterValue | null) => {
    setAllFilters((prev) => {
      const next = new Map(prev);
      const current = { ...(prev.get(moduleId) ?? {}) };
      if (value === null) {
        delete current[key];
      } else {
        current[key] = value;
      }
      if (Object.keys(current).length === 0) next.delete(moduleId);
      else next.set(moduleId, current);
      return next;
    });
  }, []);

  const clearFilters = useCallback((moduleId: string) => {
    setAllFilters((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
    setAllSearch((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
  }, []);

  const hasActiveFilters = useCallback(
    (moduleId: string): boolean => {
      const filters = allFilters.get(moduleId);
      if (filters && Object.keys(filters).length > 0) return true;
      const search = allSearch.get(moduleId);
      if (search && search.length > 0) return true;
      return false;
    },
    [allFilters, allSearch],
  );

  const getSearch = useCallback(
    (moduleId: string): string => allSearch.get(moduleId) ?? "",
    [allSearch],
  );

  const setSearch = useCallback((moduleId: string, query: string) => {
    setAllSearch((prev) => {
      const next = new Map(prev);
      if (query) next.set(moduleId, query);
      else next.delete(moduleId);
      return next;
    });
  }, []);

  const registerData = useCallback((moduleId: string, data: any[]) => {
    setModuleData((prev) => {
      if (prev.get(moduleId) === data) return prev;
      const next = new Map(prev);
      next.set(moduleId, data);
      return next;
    });
  }, []);

  const unregisterData = useCallback((moduleId: string) => {
    setModuleData((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
  }, []);

  return (
    <ExplorerContext.Provider
      value={{
        openModuleId, openExplorer, closeExplorer,
        getFilters, setFilter, clearFilters, hasActiveFilters,
        getSearch, setSearch,
        moduleData, registerData, unregisterData,
      }}
    >
      {children}
    </ExplorerContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useExplorer() {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error("useExplorer must be used within ExplorerProvider");
  return ctx;
}

/**
 * Returns a predicate function that tests whether an item passes all active
 * filters for the given module. Uses the module's filter schema from its definition.
 */
export function useExplorerFilters(moduleId: string): (item: any) => boolean {
  const { getFilters, getSearch } = useExplorer();
  const filters = getFilters(moduleId);
  const search = getSearch(moduleId);

  const def = MODULE_REGISTRY.find((m) => m.id === moduleId);
  const schema = def?.filters;

  return useMemo(() => {
    const activeFilters = Object.entries(filters);
    const searchLower = search.toLowerCase();

    return (item: any): boolean => {
      // Check schema-based filters
      for (const [key, fv] of activeFilters) {
        const val = item[key];
        if (fv.type === "range") {
          const num = typeof val === "number" ? val : parseFloat(val);
          if (isNaN(num) || num < fv.min || num > fv.max) return false;
        } else if (fv.type === "enum") {
          const str = val == null ? "" : String(val);
          if (fv.selected.size > 0 && !fv.selected.has(str)) return false;
        } else if (fv.type === "boolean") {
          if (fv.value && !val) return false;
        } else if (fv.type === "text") {
          const str = val == null ? "" : String(val).toLowerCase();
          if (!str.includes(fv.value.toLowerCase())) return false;
        }
      }

      // Check search query — substring match across all string/number fields
      if (searchLower) {
        let found = false;
        for (const v of Object.values(item)) {
          if (v != null && String(v).toLowerCase().includes(searchLower)) {
            found = true;
            break;
          }
        }
        if (!found) return false;
      }

      return true;
    };
  }, [filters, search, schema]);
}
```

**Step 2: Create `frontend/src/hooks/use-module-data.ts`**

```ts
import { useEffect } from "react";
import { useExplorer } from "@/modules/explorer-context";

export function useModuleData(moduleId: string, data: any[] | null) {
  const { registerData, unregisterData } = useExplorer();

  useEffect(() => {
    if (data) registerData(moduleId, data);
  }, [moduleId, data, registerData]);

  useEffect(() => {
    return () => unregisterData(moduleId);
  }, [moduleId, unregisterData]);
}
```

**Step 3: Wrap ModuleProvider with ExplorerProvider in `frontend/src/modules/module-context.tsx`**

Add import at top:
```ts
import { ExplorerProvider } from "@/modules/explorer-context";
```

In the `ModuleProvider` function, wrap the return JSX — add `<ExplorerProvider>` as the outermost wrapper around the existing context nesting:

Change the return in `ModuleProvider` from:
```tsx
return (
  <ToggleContext.Provider value={{ enabledModules, toggle }}>
    ...
  </ToggleContext.Provider>
);
```

To:
```tsx
return (
  <ExplorerProvider>
    <ToggleContext.Provider value={{ enabledModules, toggle }}>
      ...
    </ToggleContext.Provider>
  </ExplorerProvider>
);
```

**Step 4: Verify build**

```bash
cd frontend && npx vite build
```

**Step 5: Commit**

```bash
git add frontend/src/modules/explorer-context.tsx frontend/src/hooks/use-module-data.ts frontend/src/modules/module-context.tsx
git commit -m "feat: add ExplorerContext with data registry and filter hooks"
```

---

### Task 5: Create the ExplorerPanel component

**Files:**
- Create: `frontend/src/components/shell/explorer-panel.tsx`

This is the main panel UI. It reads the open module's definition, renders search + filter toggle + filter controls + item list + source footer.

**Step 1: Create `frontend/src/components/shell/explorer-panel.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { X, SlidersHorizontal, Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { MODULE_REGISTRY } from "@/modules/registry";
import { useExplorer, type FilterValue } from "@/modules/explorer-context";
import { useModuleToggle } from "@/modules/module-context";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import type { FilterField, ListColumn } from "@/types/modules";

// ── Filter Controls ────────────────────────────────────────────────────────

function RangeFilter({
  field,
  value,
  onChange,
}: {
  field: FilterField & { type: "range" };
  value: { min: number; max: number } | null;
  onChange: (v: FilterValue | null) => void;
}) {
  const lo = value?.min ?? field.min;
  const hi = value?.max ?? field.max;
  const isDefault = lo === field.min && hi === field.max;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted">{field.label}</span>
        <span className="font-mono text-white/60">
          {lo}–{hi}{field.unit ? ` ${field.unit}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={(field.max - field.min) / 100}
          value={lo}
          onChange={(e) => {
            const min = parseFloat(e.target.value);
            if (min === field.min && hi === field.max) onChange(null);
            else onChange({ type: "range", min, max: hi });
          }}
          className="h-1 flex-1 appearance-none rounded bg-panel-border accent-accent"
        />
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={(field.max - field.min) / 100}
          value={hi}
          onChange={(e) => {
            const max = parseFloat(e.target.value);
            if (lo === field.min && max === field.max) onChange(null);
            else onChange({ type: "range", min: lo, max });
          }}
          className="h-1 flex-1 appearance-none rounded bg-panel-border accent-accent"
        />
      </div>
    </div>
  );
}

function EnumFilter({
  field,
  value,
  items,
  onChange,
}: {
  field: FilterField & { type: "enum" };
  value: Set<string> | null;
  items: any[];
  onChange: (v: FilterValue | null) => void;
}) {
  const options = useMemo(() => {
    if (field.options) return field.options;
    const counts = new Map<string, number>();
    for (const item of items) {
      const v = item[field.key];
      if (v != null && v !== "") {
        const s = String(v);
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
  }, [field, items]);

  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, 8);
  const selected = value ?? new Set<string>();

  const toggle = (opt: string) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    if (next.size === 0) onChange(null);
    else onChange({ type: "enum", selected: next });
  };

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] text-muted">{field.label}</span>
      <div className="flex flex-wrap gap-1">
        {visible.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
              selected.has(opt)
                ? "bg-accent text-white"
                : "bg-panel-border text-white/60 hover:bg-panel-hover hover:text-white/80"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {options.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-accent hover:text-accent/80"
        >
          {expanded ? "Show less" : `+${options.length - 8} more`}
        </button>
      )}
    </div>
  );
}

function BooleanFilter({
  field,
  value,
  onChange,
}: {
  field: FilterField & { type: "boolean" };
  value: boolean;
  onChange: (v: FilterValue | null) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted cursor-pointer">
      <div
        className={`h-3 w-3 border transition-colors ${
          value ? "border-accent bg-accent" : "border-muted/40 bg-transparent"
        }`}
        onClick={() => onChange(value ? null : { type: "boolean", value: true })}
      />
      {field.label}
    </label>
  );
}

function FilterChips({
  moduleId,
  filters,
}: {
  moduleId: string;
  filters: Record<string, FilterValue>;
}) {
  const { setFilter } = useExplorer();
  const entries = Object.entries(filters);
  if (entries.length === 0) return null;

  const def = MODULE_REGISTRY.find((m) => m.id === moduleId);
  const schema = def?.filters ?? [];

  return (
    <div className="flex flex-wrap gap-1 px-3 pb-2">
      {entries.map(([key, fv]) => {
        const field = schema.find((f) => f.key === key);
        const label = field?.label ?? key;
        let display = "";
        if (fv.type === "range") display = `${fv.min}–${fv.max}`;
        else if (fv.type === "enum") display = `${fv.selected.size} selected`;
        else if (fv.type === "boolean") display = "Yes";
        else if (fv.type === "text") display = fv.value;

        return (
          <button
            key={key}
            onClick={() => setFilter(moduleId, key, null)}
            className="flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent hover:bg-accent/30"
          >
            {label}: {display}
            <X size={8} />
          </button>
        );
      })}
    </div>
  );
}

// ── Item List ──────────────────────────────────────────────────────────────

function ItemList({
  items,
  columns,
  nameKey,
  moduleId,
  onSelect,
}: {
  items: any[];
  columns: ListColumn[];
  nameKey: string;
  moduleId: string;
  onSelect: (item: any) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Column headers */}
      <div className="flex items-center border-b border-panel-border px-3 py-1.5">
        {columns.map((col) => (
          <span
            key={col.key}
            className="text-[10px] font-medium uppercase tracking-wider text-muted/60"
            style={{ width: col.width, flexShrink: col.width ? 0 : undefined, flex: col.width ? undefined : 1 }}
          >
            {col.label}
          </span>
        ))}
      </div>

      {/* Virtualized rows */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted/50">
            <span className="text-xs">No items match current filters</span>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((row) => {
              const item = items[row.index];
              return (
                <button
                  key={row.index}
                  onClick={() => onSelect(item)}
                  className="absolute left-0 right-0 flex items-center px-3 text-[11px] text-white/70 transition-colors hover:bg-panel-hover hover:text-white"
                  style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                >
                  {columns.map((col) => {
                    const val = item[col.key];
                    const display = val == null ? "—" : typeof val === "number" ? val.toLocaleString() : String(val);
                    return (
                      <span
                        key={col.key}
                        className="truncate"
                        style={{ width: col.width, flexShrink: col.width ? 0 : undefined, flex: col.width ? undefined : 1 }}
                      >
                        {display}
                      </span>
                    );
                  })}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────

export function ExplorerPanel() {
  const { openModuleId, closeExplorer, getFilters, setFilter, clearFilters, getSearch, setSearch, moduleData } = useExplorer();
  const { enabledModules, toggle } = useModuleToggle();
  const { current: mapRef } = useMap();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!openModuleId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExplorer();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openModuleId, closeExplorer]);

  // Auto-enable layer
  useEffect(() => {
    if (openModuleId && !enabledModules.has(openModuleId)) {
      toggle(openModuleId);
    }
  }, [openModuleId]);

  const def = MODULE_REGISTRY.find((m) => m.id === openModuleId);
  if (!openModuleId || !def) return null;

  const color = CATEGORY_COLORS[def.category] ?? "#8892b0";
  const Icon = def.icon;
  const filters = getFilters(openModuleId);
  const search = getSearch(openModuleId);
  const hasFilters = Object.keys(filters).length > 0;
  const rawData = moduleData.get(openModuleId) ?? [];
  const nameKey = def.nameKey ?? "name";
  const columns = def.listColumns ?? [{ key: nameKey, label: "Name" }];

  // Apply filters + search to build displayed list
  const filteredItems = useMemo(() => {
    const searchLower = search.toLowerCase();
    return rawData.filter((item) => {
      // Schema filters
      for (const [key, fv] of Object.entries(filters)) {
        const val = item[key];
        if (fv.type === "range") {
          const num = typeof val === "number" ? val : parseFloat(val);
          if (isNaN(num) || num < fv.min || num > fv.max) return false;
        } else if (fv.type === "enum") {
          if (fv.selected.size > 0 && !fv.selected.has(val == null ? "" : String(val))) return false;
        } else if (fv.type === "boolean") {
          if (fv.value && !val) return false;
        }
      }
      // Search
      if (searchLower) {
        let found = false;
        for (const v of Object.values(item)) {
          if (v != null && String(v).toLowerCase().includes(searchLower)) { found = true; break; }
        }
        if (!found) return false;
      }
      return true;
    });
  }, [rawData, filters, search]);

  const handleSelect = useCallback((item: any) => {
    const lat = item.latitude ?? item.lat;
    const lng = item.longitude ?? item.lng;
    if (lat != null && lng != null) {
      mapRef?.getMap()?.flyTo({ center: [lng, lat], zoom: def.focusZoom, duration: 1500 });
    }
  }, [mapRef, def.focusZoom]);

  return (
    <div className="flex h-full w-80 flex-col border-r border-panel-border bg-panel">
      {/* Header */}
      <div className="flex h-12 items-center gap-3 px-4 bg-accent shrink-0">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ width: 22, height: 22, backgroundColor: color, border: "1px solid rgba(255,255,255,0.8)" }}
        >
          <Icon size={12} className="text-white" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[13px] font-medium text-white truncate translate-y-px">
            {def.name}
          </span>
        </div>
        <span className="text-[11px] text-white/60 tabular-nums shrink-0">
          {filteredItems.length.toLocaleString()}{rawData.length !== filteredItems.length ? ` / ${rawData.length.toLocaleString()}` : ""}
        </span>
        <button onClick={closeExplorer} className="flex h-6 w-6 items-center justify-center text-white transition-colors hover:bg-white/10">
          <X size={14} />
        </button>
      </div>

      <div className="h-px bg-panel-border shrink-0" />

      {/* Search + filter toggle */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted/50" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(openModuleId, e.target.value)}
            className="h-7 w-full rounded bg-panel-border/50 pl-7 pr-2 text-[11px] text-white placeholder:text-muted/40 outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>
        {def.filters && def.filters.length > 0 && (
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors ${
              filtersOpen ? "bg-accent/20 text-accent" : "bg-panel-border/50 text-muted/60 hover:text-white/80"
            }`}
          >
            <SlidersHorizontal size={12} />
            {hasFilters && (
              <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
            )}
          </button>
        )}
      </div>

      {/* Filter controls (collapsible) */}
      {filtersOpen && def.filters && (
        <>
          <div className="space-y-3 px-3 pb-2">
            {def.filters.map((field) => {
              if (field.type === "range") {
                const fv = filters[field.key] as { min: number; max: number } | undefined;
                return (
                  <RangeFilter
                    key={field.key}
                    field={field}
                    value={fv ?? null}
                    onChange={(v) => setFilter(openModuleId, field.key, v)}
                  />
                );
              }
              if (field.type === "enum") {
                const fv = filters[field.key] as { selected: Set<string> } | undefined;
                return (
                  <EnumFilter
                    key={field.key}
                    field={field}
                    value={fv?.selected ?? null}
                    items={rawData}
                    onChange={(v) => setFilter(openModuleId, field.key, v)}
                  />
                );
              }
              if (field.type === "boolean") {
                const fv = filters[field.key] as { value: boolean } | undefined;
                return (
                  <BooleanFilter
                    key={field.key}
                    field={field}
                    value={fv?.value ?? false}
                    onChange={(v) => setFilter(openModuleId, field.key, v)}
                  />
                );
              }
              return null;
            })}
          </div>
          <div className="h-px bg-panel-border shrink-0" />
        </>
      )}

      {/* Active filter chips */}
      <FilterChips moduleId={openModuleId} filters={filters} />

      {/* Item list */}
      <ItemList
        items={filteredItems}
        columns={columns}
        nameKey={nameKey}
        moduleId={openModuleId}
        onSelect={handleSelect}
      />

      {/* Source footer */}
      {def.source && (
        <>
          <div className="h-px bg-panel-border shrink-0" />
          <div className="flex items-center justify-between px-3 py-2 shrink-0">
            <span className="text-[10px] text-muted/50">Source: {def.source.name}</span>
            {def.source.url && (
              <a href={def.source.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted/50 hover:text-accent">
                ↗
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
cd frontend && npx vite build
```

**Step 3: Commit**

```bash
git add frontend/src/components/shell/explorer-panel.tsx
git commit -m "feat: add ExplorerPanel component with search, filters, and virtualized list"
```

---

### Task 6: Integrate ExplorerPanel into sidebar and update ModuleRow click behavior

**Files:**
- Modify: `frontend/src/components/shell/sidebar.tsx`

**Step 1: Update sidebar.tsx**

Add imports at top:
```ts
import { useExplorer } from "@/modules/explorer-context";
import { ExplorerPanel } from "@/components/shell/explorer-panel";
```

**Update the `ModuleRow` component** to split click behavior: clicking the name opens the explorer, clicking the checkbox toggles the layer. Also add a dot badge when filters are active.

Replace the entire `ModuleRow` function with:

```tsx
function ModuleRow({
  def,
  enabled,
  count,
  onToggle,
  onExplore,
  hasActiveFilters,
  isExploring,
}: {
  def: ModuleDefinition;
  enabled: boolean;
  count: number | null | undefined;
  onToggle: () => void;
  onExplore: () => void;
  hasActiveFilters: boolean;
  isExploring: boolean;
}) {
  const { icon: Icon, name, category } = def;
  const color = CATEGORY_COLORS[category] ?? "#8892b0";

  return (
    <div
      className={`flex w-full items-center gap-3 px-2 py-1.5 text-xs text-white/70 transition-colors hover:bg-panel-hover hover:text-white ${
        isExploring ? "bg-panel-hover text-white" : ""
      }`}
    >
      <button onClick={onExplore} className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 22,
            height: 22,
            backgroundColor: color,
            border: "1px solid rgba(255,255,255,0.8)",
          }}
        >
          <Icon size={12} className="text-white" />
        </div>
        <span className="text-[13px] truncate">
          {name}
          {count !== undefined && (
            count === null ? (
              <span className="ml-1 inline-block h-2.5 w-6 translate-y-px animate-pulse rounded bg-muted/20" />
            ) : (
              <span className="tabular-nums"> ({count.toLocaleString()})</span>
            )
          )}
        </span>
      </button>
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        {hasActiveFilters && (
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`h-3 w-3 border transition-colors ${
            enabled
              ? "border-accent bg-accent"
              : "border-muted/40 bg-transparent"
          }`}
        />
      </div>
    </div>
  );
}
```

**Update `CategoryGroup`** to pass the new props — add `onExplore`, `explorerModuleId`, and `hasActiveFilters` callback:

Replace the `CategoryGroup` function signature and its `ModuleRow` rendering. Add new props:

```tsx
function CategoryGroup({
  category,
  modules,
  enabledModules,
  moduleCounts,
  open,
  onToggleOpen,
  onToggle,
  onExplore,
  explorerModuleId,
  hasActiveFilters,
}: {
  category: string;
  modules: ModuleDefinition[];
  enabledModules: Set<string>;
  moduleCounts: Map<string, number | null>;
  open: boolean;
  onToggleOpen: () => void;
  onToggle: (id: string) => void;
  onExplore: (id: string) => void;
  explorerModuleId: string | null;
  hasActiveFilters: (id: string) => boolean;
}) {
```

And update the `ModuleRow` rendering inside CategoryGroup to pass new props:
```tsx
<ModuleRow
  key={def.id}
  def={def}
  enabled={enabledModules.has(def.id)}
  count={moduleCounts.get(def.id)}
  onToggle={() => onToggle(def.id)}
  onExplore={() => onExplore(def.id)}
  hasActiveFilters={hasActiveFilters(def.id)}
  isExploring={explorerModuleId === def.id}
/>
```

**Update the `Sidebar` component** to use explorer context and render the panel:

In the `Sidebar` function, add:
```tsx
const { openModuleId, openExplorer, hasActiveFilters } = useExplorer();
```

Update each `CategoryGroup` to pass explorer props:
```tsx
<CategoryGroup
  key={category}
  category={category}
  modules={modules}
  enabledModules={enabledModules}
  moduleCounts={moduleCounts}
  open={openCategories.has(category)}
  onToggleOpen={() => toggleCategory(category)}
  onToggle={toggle}
  onExplore={openExplorer}
  explorerModuleId={openModuleId}
  hasActiveFilters={hasActiveFilters}
/>
```

After the modules flyout div (the `w-72` div), render `ExplorerPanel` adjacent to it — it should render inside the sidebar flex container, after the modules panel, before the click-away backdrop:

```tsx
{/* Modules flyout */}
{modulesOpen && (
  <>
    <div className="h-full w-72 border-r border-panel-border bg-panel">
      {/* ... existing content ... */}
    </div>

    {/* Explorer panel */}
    {openModuleId && <ExplorerPanel />}

    {/* Click-away backdrop */}
    <div
      className="fixed inset-0 z-[-1]"
      onClick={() => setModulesOpen(false)}
    />
  </>
)}
```

Also render the explorer panel even when the modules sidebar is closed (user might close sidebar but keep explorer open). Add after the `{modulesOpen && ...}` block:

```tsx
{/* Explorer panel without sidebar */}
{!modulesOpen && openModuleId && (
  <ExplorerPanel />
)}
```

**Step 2: Verify build**

```bash
cd frontend && npx vite build
```

**Step 3: Commit**

```bash
git add frontend/src/components/shell/sidebar.tsx
git commit -m "feat: integrate explorer panel into sidebar with split click behavior"
```

---

### Task 7: Register data from all 14 map layers + apply explorer filters

**Files:**
- Modify: all 14 `frontend/src/modules/*/[*-layer.tsx]` files

**Step 1: Pattern for each layer**

Each layer needs two changes:

1. **Register data** with the explorer using `useModuleData` hook
2. **Apply explorer filters** to the data before building GeoJSON

For **most modules** (earthquakes, storms, wildfires, volcanoes, launches, airports, ports, power-plants, air-quality, buoys), the pattern in the outer component is:

```tsx
// Add imports
import { useModuleData } from "@/hooks/use-module-data";
import { useExplorerFilters } from "@/modules/explorer-context";

// In the outer component (e.g., EarthquakesLayer):
export function EarthquakesLayer() {
  const quakes = useEarthquakes();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => quakes ? filterByTime(quakes, "earthquakes", timeFilter) : null,
    [quakes, timeFilter],
  );

  // NEW: apply explorer filters
  const matchesFilters = useExplorerFilters("earthquakes");
  const filtered = useMemo(
    () => timeFiltered ? timeFiltered.filter(matchesFilters) : null,
    [timeFiltered, matchesFilters],
  );

  // NEW: register data for explorer panel (use timeFiltered so panel shows time-filtered items)
  useModuleData("earthquakes", timeFiltered);

  useModuleCount("earthquakes", filtered?.length ?? null);

  // ... rest uses filtered instead of timeFiltered ...
  // Pass `filtered ?? []` to inner component
  // Region count also computed from `filtered`
}
```

Key principle: `useModuleData` registers the time-filtered data (what the panel lists and derives enum options from). `useModuleCount` and the inner component use the fully filtered data (time + explorer filters).

Apply this pattern to all modules. The specific variable names differ per module but the pattern is identical:

**earthquakes-layer.tsx:** `timeFiltered` → filter → `filtered`. Register `timeFiltered`. Pass `filtered` to inner.
**storms-layer.tsx:** Same pattern with `useStorms()`.
**wildfires-layer.tsx:** Same pattern with `useWildfires()`.
**volcanoes-layer.tsx:** Same pattern with `useVolcanoes()`.
**launches-layer.tsx:** Same pattern with `useLaunches()`.
**airports-layer.tsx:** Same pattern with `useAirports()`. (No time filter — just `airports` directly.)
**ports-layer.tsx:** Same pattern with `usePorts()`. (No time filter.)
**power-plants-layer.tsx:** Same pattern with `usePowerPlants()`. (No time filter.)
**air-quality-layer.tsx:** Same pattern with `useAirQuality()`.
**buoys-layer.tsx:** Same pattern with `useBuoys()`.

For modules without time filtering (airports, ports, power-plants, cables), the `timeFiltered` step doesn't exist — apply `matchesFilters` directly to the raw data.

**Flights** are special — `useFlights()` returns the array, time filter applies, then explorer filter. Same pattern.

**Ships** are special — `useShips()` returns from WebSocket. Same pattern applies.

**Satellites** are special — uses `useSatellitePositions()` for map rendering. Register positions as data. Filter by checking if the position's associated GP record matches the filter. For the initial pass, register the positions array and skip explorer filtering (satellite data structure is complex with positions + records). Can be enhanced later.

**Cables** are special — `useCables()` returns `CableData` not an array. Register `data.cables.features` as the data array. The features have `properties.name`. No filter schema defined.

**Step 2: Apply the changes to each layer file**

For each layer:
1. Add the two imports (`useModuleData`, `useExplorerFilters`)
2. Add `const matchesFilters = useExplorerFilters(MODULE_ID);` in the outer component
3. Add the filter `useMemo` step
4. Add `useModuleData(MODULE_ID, dataBeforeExplorerFilters);`
5. Update `useModuleCount` to use the fully filtered data
6. Update what gets passed to the inner component

**Step 3: Verify build**

```bash
cd frontend && npx vite build
```

**Step 4: Verify dev server**

```bash
cd frontend && npx vite dev
```

Open in browser. Toggle data layers. Click a layer name — explorer panel should open. Search should filter the list. Toggling a filter should affect both the list and map pins.

**Step 5: Commit**

```bash
git add frontend/src/modules/*/
git commit -m "feat: register module data and apply explorer filters to all layers"
```

---

### Task 8: Backend country reverse geocoding utility

**Files:**
- Create: `backend/app/geo/country_lookup.py`
- Create: `backend/app/geo/__init__.py`
- Download: Natural Earth simplified country boundaries

**Step 1: Download the Natural Earth data**

```bash
cd backend
mkdir -p app/geo
curl -L "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip" -o /tmp/ne_countries.zip
python3 -c "
import zipfile, json
with zipfile.ZipFile('/tmp/ne_countries.zip') as z:
    # Find the .geojson or convert from shapefile
    names = z.namelist()
    print(names)
"
```

Actually, Natural Earth ships shapefiles. Use the GeoJSON version from GitHub instead:

```bash
curl -L "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson" -o app/geo/countries.geojson
```

This is ~23MB (simplified). For a more lightweight version, use a pre-simplified one:

```bash
curl -L "https://r2.datahub.io/clvyjaryy0000la0cxieg4o8o/main/raw/data/countries.geojson" -o app/geo/countries.geojson
```

If neither URL is reliable, we can generate from Natural Earth shapefiles. The key requirement is a GeoJSON FeatureCollection where each feature has `properties.ADMIN` or `properties.name` as the country name and a `geometry` polygon.

**Step 2: Create `backend/app/geo/__init__.py`**

```python
```

(Empty init file)

**Step 3: Create `backend/app/geo/country_lookup.py`**

```python
"""Lightweight point-in-country lookup using Natural Earth boundaries."""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_countries: list[dict] | None = None


def _load_countries() -> list[dict]:
    global _countries
    if _countries is not None:
        return _countries

    path = Path(__file__).parent / "countries.geojson"
    if not path.exists():
        logger.warning("countries.geojson not found at %s", path)
        _countries = []
        return _countries

    with open(path) as f:
        data = json.load(f)

    _countries = []
    for feature in data.get("features", []):
        name = (
            feature.get("properties", {}).get("ADMIN")
            or feature.get("properties", {}).get("name")
            or feature.get("properties", {}).get("NAME")
        )
        if not name:
            continue

        geom = feature.get("geometry")
        if not geom:
            continue

        # Pre-compute bounding box for fast rejection
        coords = _flatten_coords(geom)
        if not coords:
            continue

        lngs = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        bbox = (min(lngs), min(lats), max(lngs), max(lats))

        _countries.append({
            "name": name,
            "geometry": geom,
            "bbox": bbox,
        })

    logger.info("Loaded %d countries for reverse geocoding", len(_countries))
    return _countries


def _flatten_coords(geom: dict) -> list[tuple[float, float]]:
    """Extract all coordinate pairs from a GeoJSON geometry."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if gtype == "Polygon":
        return [(c[0], c[1]) for ring in coords for c in ring]
    elif gtype == "MultiPolygon":
        return [(c[0], c[1]) for poly in coords for ring in poly for c in ring]
    return []


def _point_in_polygon(lng: float, lat: float, rings: list[list]) -> bool:
    """Ray-casting algorithm for point-in-polygon."""
    for ring in rings:
        n = len(ring)
        inside = False
        j = n - 1
        for i in range(n):
            xi, yi = ring[i][0], ring[i][1]
            xj, yj = ring[j][0], ring[j][1]
            if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
        if inside:
            return True
    return False


def _point_in_geometry(lng: float, lat: float, geom: dict) -> bool:
    """Test if a point is inside a GeoJSON Polygon or MultiPolygon."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if gtype == "Polygon":
        return _point_in_polygon(lng, lat, coords)
    elif gtype == "MultiPolygon":
        for polygon in coords:
            if _point_in_polygon(lng, lat, polygon):
                return True
    return False


def country_from_coords(lat: float, lng: float) -> str | None:
    """Return country name for the given coordinates, or None if in ocean."""
    countries = _load_countries()

    for country in countries:
        bbox = country["bbox"]
        # Fast bbox rejection
        if lng < bbox[0] or lng > bbox[2] or lat < bbox[1] or lat > bbox[3]:
            continue
        if _point_in_geometry(lng, lat, country["geometry"]):
            return country["name"]

    return None
```

**Step 4: Verify**

```bash
cd backend && python3 -c "from app.geo.country_lookup import country_from_coords; print(country_from_coords(35.6762, 139.6503))"
```

Expected: `Japan` (or similar)

**Step 5: Commit**

```bash
git add backend/app/geo/
git commit -m "feat: add country reverse geocoding utility with Natural Earth boundaries"
```

---

### Task 9: Add country field to earthquakes, wildfires, volcanoes, and launches backends

**Files:**
- Modify: `backend/app/routers/earthquakes.py`
- Modify: `backend/app/routers/wildfires.py`
- Modify: `backend/app/routers/volcanoes.py`
- Modify: `backend/app/routers/launches.py`

**Step 1: Add country to each router**

For each router, import the lookup and add the field when building the result dict.

Add to imports in each file:
```python
from app.geo.country_lookup import country_from_coords
```

Then in the data processing loop, add:
```python
"country": country_from_coords(lat, lng),
```

to the result dict for each item, after latitude and longitude are known.

For **earthquakes.py**: find where results are built (likely in the response processing loop), add `"country": country_from_coords(lat, lng)` to each earthquake dict.

For **wildfires.py**: same pattern in the processing loop.

For **volcanoes.py**: same pattern.

For **launches.py**: in the `_parse_launch()` function, add `"country": country_from_coords(lat, lng)` to the return dict.

**Step 2: Update frontend TypeScript types**

- Modify: `frontend/src/types/earthquakes.ts` — add `country?: string`
- Modify: `frontend/src/types/wildfires.ts` — add `country?: string`
- Modify: `frontend/src/types/volcanoes.ts` — add `country?: string`
- Modify: `frontend/src/types/launches.ts` — add `country?: string`

**Step 3: Verify backend**

```bash
cd backend && python3 -c "from app.geo.country_lookup import country_from_coords; print(country_from_coords(37.7749, -122.4194))"
```

**Step 4: Verify frontend build**

```bash
cd frontend && npx vite build
```

**Step 5: Commit**

```bash
git add backend/app/routers/earthquakes.py backend/app/routers/wildfires.py backend/app/routers/volcanoes.py backend/app/routers/launches.py
git add frontend/src/types/earthquakes.ts frontend/src/types/wildfires.ts frontend/src/types/volcanoes.ts frontend/src/types/launches.ts
git commit -m "feat: add country reverse geocoding to earthquakes, wildfires, volcanoes, launches"
```

---

### Task 10: Clear explorer filters when layer is toggled off

**Files:**
- Modify: `frontend/src/modules/module-context.tsx`

**Step 1: Update the toggle function to clear explorer filters**

In `ModuleProvider`, import `useExplorer`:

This creates a circular dependency issue since `ExplorerProvider` wraps `ToggleContext`. Instead, add a callback ref pattern.

Simpler approach: handle this in the sidebar. In `sidebar.tsx`, update the toggle handler to also clear explorer state:

In the `Sidebar` component:
```tsx
const { clearFilters, closeExplorer, openModuleId } = useExplorer();

// Replace onToggle in CategoryGroup with:
const handleToggle = useCallback((id: string) => {
  const willDisable = enabledModules.has(id);
  toggle(id);
  if (willDisable) {
    clearFilters(id);
    if (openModuleId === id) closeExplorer();
  }
}, [enabledModules, toggle, clearFilters, openModuleId, closeExplorer]);
```

Then pass `handleToggle` instead of `toggle` to `CategoryGroup`'s `onToggle`.

**Step 2: Verify build**

```bash
cd frontend && npx vite build
```

**Step 3: Commit**

```bash
git add frontend/src/components/shell/sidebar.tsx
git commit -m "feat: clear explorer filters when layer is toggled off"
```

---

### Task 11: Polish and edge cases

**Files:**
- Modify: `frontend/src/components/shell/explorer-panel.tsx`
- Modify: `frontend/src/index.css` (if animation needed)

**Step 1: Add slide-in animation to explorer panel**

In `explorer-panel.tsx`, add animation class to the outer div:

```tsx
<div className="flex h-full w-80 flex-col border-r border-panel-border bg-panel animate-slide-in-left">
```

In `index.css`, add:
```css
@keyframes slide-in-left {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-slide-in-left {
  animation: slide-in-left 0.2s ease-out;
}
```

**Step 2: Handle selected item filtered out**

In each module's selection context (e.g., `earthquake-context.tsx`), if an item is selected and it gets filtered out, it should be deselected. This happens naturally because the item won't appear in the list or on the map. The detail card will still show (it reads from selection state, not from the filtered array).

Add to the explorer panel's `handleSelect` — when an item is clicked in the list, dispatch to the module's selection system. This requires module-specific selection hooks, which makes it complex.

For the initial implementation, clicking an item just flies to it on the map. Selection happens via the existing map click flow — the user clicks the pin after flying to it. This keeps things simple and avoids coupling the explorer to each module's selection system.

**Step 3: Verify build and dev server**

```bash
cd frontend && npx vite build
cd frontend && npx vite dev
```

**Step 4: Commit**

```bash
git add frontend/src/components/shell/explorer-panel.tsx frontend/src/index.css
git commit -m "feat: add explorer panel polish and animation"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Install @tanstack/react-virtual | package.json |
| 2 | Add FilterField types to ModuleDefinition | types/modules.ts |
| 3 | Add filter schemas to all 14 definitions | modules/*/definition.ts |
| 4 | Create ExplorerContext + data registry + filter hook | explorer-context.tsx, use-module-data.ts, module-context.tsx |
| 5 | Create ExplorerPanel component | explorer-panel.tsx |
| 6 | Integrate into sidebar, split click behavior | sidebar.tsx |
| 7 | Register data + apply filters in all 14 layers | modules/*/\*-layer.tsx |
| 8 | Backend country lookup utility | geo/country_lookup.py |
| 9 | Add country to 4 backend routers + frontend types | routers/*.py, types/*.ts |
| 10 | Clear filters on layer toggle off | sidebar.tsx |
| 11 | Polish: animation, edge cases | explorer-panel.tsx, index.css |
