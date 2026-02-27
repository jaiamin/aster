import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { getInitialLayers, getInitialSearchQuery, getInitialTimeFilter } from "@/lib/url-state";
import type { TimePreset } from "@/lib/time-filter";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { ExplorerProvider } from "@/modules/explorer-context";

// ── Toggle Context ──────────────────────────────────────────────────────────

interface ToggleContextValue {
  enabledModules: Set<string>;
  toggle: (id: string) => void;
}

const ToggleContext = createContext<ToggleContextValue | null>(null);

// ── Counts Context ──────────────────────────────────────────────────────────

interface CountsContextValue {
  moduleCounts: Map<string, number | null>;
  registerCount: (moduleId: string, count: number | null) => void;
  unregisterCount: (moduleId: string) => void;
}

const CountsContext = createContext<CountsContextValue | null>(null);

// ── Selection Context ───────────────────────────────────────────────────────

type DeselectFn = () => void;

interface SelectionContextValue {
  registerDeselect: (moduleId: string, deselect: DeselectFn) => void;
  unregisterDeselect: (moduleId: string) => void;
  notifySelected: (moduleId: string) => void;
  deselectAll: (exclude?: string) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

// ── Filter Context ──────────────────────────────────────────────────────────

interface FilterContextValue {
  searchQuery: string;
  timeFilter: TimePreset;
  setSearchQuery: (query: string) => void;
  setTimeFilter: (preset: TimePreset) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// ── Region Context ─────────────────────────────────────────────────────────

type Bbox = [number, number, number, number]; // [west, south, east, north]

function computeBbox(geometry: GeoJSON.Geometry): Bbox {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  const visit = (coords: unknown) => {
    if (typeof (coords as number[])[0] === "number") {
      const [lng, lat] = coords as number[];
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      return;
    }
    for (const c of coords as unknown[]) visit(c);
  };
  if ("coordinates" in geometry) visit((geometry as { coordinates: unknown }).coordinates);
  return [west, south, east, north];
}

interface RegionContextValue {
  regionBoundary: GeoJSON.Geometry | null;
  regionActive: boolean;
  isInRegion: (lng: number, lat: number) => boolean;
  regionCounts: Map<string, number | null>;
  registerRegionCount: (moduleId: string, count: number | null) => void;
  unregisterRegionCount: (moduleId: string) => void;
  setRegionBoundary: (geom: GeoJSON.Geometry | null) => void;
}

const RegionContext = createContext<RegionContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────────

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(getInitialLayers);
  const [moduleCounts, setModuleCounts] = useState<Map<string, number | null>>(new Map());
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [timeFilter, setTimeFilter] = useState<TimePreset>(getInitialTimeFilter);
  const deselectMap = useRef(new Map<string, DeselectFn>());
  const [regionBoundary, setRegionBoundary] = useState<GeoJSON.Geometry | null>(null);
  const [regionCounts, setRegionCounts] = useState<Map<string, number | null>>(new Map());
  const bboxRef = useRef<Bbox | null>(null);

  // Toggle
  const toggle = useCallback((id: string) => {
    setEnabledModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Counts
  const registerCount = useCallback((moduleId: string, count: number | null) => {
    setModuleCounts((prev) => {
      if (prev.get(moduleId) === count) return prev;
      const next = new Map(prev);
      next.set(moduleId, count);
      return next;
    });
  }, []);

  const unregisterCount = useCallback((moduleId: string) => {
    setModuleCounts((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
  }, []);

  // Selection
  const registerDeselect = useCallback((moduleId: string, deselect: DeselectFn) => {
    deselectMap.current.set(moduleId, deselect);
  }, []);

  const unregisterDeselect = useCallback((moduleId: string) => {
    deselectMap.current.delete(moduleId);
  }, []);

  const notifySelected = useCallback((moduleId: string) => {
    for (const [id, deselect] of deselectMap.current) {
      if (id !== moduleId) deselect();
    }
  }, []);

  const deselectAll = useCallback((exclude?: string) => {
    for (const [id, deselect] of deselectMap.current) {
      if (id !== exclude) deselect();
    }
  }, []);

  // Region
  const regionActive = regionBoundary !== null;

  const handleSetRegionBoundary = useCallback((geom: GeoJSON.Geometry | null) => {
    setRegionBoundary(geom);
    bboxRef.current = geom ? computeBbox(geom) : null;
    if (!geom) setRegionCounts(new Map());
  }, []);

  const isInRegion = useCallback(
    (lng: number, lat: number): boolean => {
      if (!regionBoundary) return true;
      const bbox = bboxRef.current;
      if (bbox && (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3])) return false;
      return booleanPointInPolygon([lng, lat], regionBoundary as GeoJSON.Polygon | GeoJSON.MultiPolygon);
    },
    [regionBoundary],
  );

  const registerRegionCount = useCallback((moduleId: string, count: number | null) => {
    setRegionCounts((prev) => {
      if (prev.get(moduleId) === count) return prev;
      const next = new Map(prev);
      next.set(moduleId, count);
      return next;
    });
  }, []);

  const unregisterRegionCount = useCallback((moduleId: string) => {
    setRegionCounts((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
  }, []);

  const toggleValue = useMemo(() => ({ enabledModules, toggle }), [enabledModules, toggle]);
  const countsValue = useMemo(() => ({ moduleCounts, registerCount, unregisterCount }), [moduleCounts, registerCount, unregisterCount]);
  const selectionValue = useMemo(() => ({ registerDeselect, unregisterDeselect, notifySelected, deselectAll }), [registerDeselect, unregisterDeselect, notifySelected, deselectAll]);
  const filterValue = useMemo(() => ({ searchQuery, timeFilter, setSearchQuery, setTimeFilter }), [searchQuery, timeFilter, setSearchQuery, setTimeFilter]);
  const regionValue = useMemo(() => ({ regionBoundary, regionActive, isInRegion, regionCounts, registerRegionCount, unregisterRegionCount, setRegionBoundary: handleSetRegionBoundary }), [regionBoundary, regionActive, isInRegion, regionCounts, registerRegionCount, unregisterRegionCount, handleSetRegionBoundary]);

  return (
    <ExplorerProvider>
      <ToggleContext.Provider value={toggleValue}>
        <CountsContext.Provider value={countsValue}>
          <SelectionContext.Provider value={selectionValue}>
            <FilterContext.Provider value={filterValue}>
              <RegionContext.Provider value={regionValue}>
                {children}
              </RegionContext.Provider>
            </FilterContext.Provider>
          </SelectionContext.Provider>
        </CountsContext.Provider>
      </ToggleContext.Provider>
    </ExplorerProvider>
  );
}

// ── Hooks ───────────────────────────────────────────────────────────────────

export function useModuleToggle() {
  const ctx = useContext(ToggleContext);
  if (!ctx) throw new Error("useModuleToggle must be used within ModuleProvider");
  return ctx;
}

export function useModuleCounts() {
  const ctx = useContext(CountsContext);
  if (!ctx) throw new Error("useModuleCounts must be used within ModuleProvider");
  return ctx;
}

export function useModuleSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useModuleSelection must be used within ModuleProvider");
  return ctx;
}

export function useModuleFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useModuleFilter must be used within ModuleProvider");
  return ctx;
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used within ModuleProvider");
  return ctx;
}

/** Legacy hook — returns all fields for backward compatibility. Prefer specific hooks. */
export function useModules() {
  const { enabledModules, toggle } = useModuleToggle();
  const { moduleCounts, registerCount, unregisterCount } = useModuleCounts();
  const { registerDeselect, unregisterDeselect, notifySelected, deselectAll } = useModuleSelection();
  const { searchQuery, timeFilter, setSearchQuery, setTimeFilter } = useModuleFilter();
  const region = useRegion();

  return {
    enabledModules, moduleCounts, searchQuery, timeFilter,
    toggle,
    registerDeselect, unregisterDeselect, notifySelected, deselectAll,
    registerCount, unregisterCount,
    setSearchQuery, setTimeFilter,
    ...region,
  };
}
