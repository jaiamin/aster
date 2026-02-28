import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { MODULE_REGISTRY } from "@/modules/registry";
import type { FilterField } from "@/types/modules";

// ── Types ────────────────────────────────────────────────────────────────────

export type FilterValue =
  | { type: "range"; min: number; max: number }
  | { type: "enum"; selected: Set<string> }
  | { type: "boolean"; value: boolean }
  | { type: "text"; value: string };

export type ActiveFilters = Record<string, FilterValue>;

const EMPTY_FILTERS: ActiveFilters = {};

// ── Navigation Context (open/close explorer) ────────────────────────────────

interface NavContextValue {
  openModuleId: string | null;
  openExplorer: (moduleId: string) => void;
  closeExplorer: () => void;
}

const NavContext = createContext<NavContextValue | null>(null);

// ── Filters Context ─────────────────────────────────────────────────────────

interface FiltersContextValue {
  getFilters: (moduleId: string) => ActiveFilters;
  setFilter: (moduleId: string, key: string, value: FilterValue) => void;
  clearFilters: (moduleId: string) => void;
  hasActiveFilters: (moduleId: string) => boolean;
  getSearch: (moduleId: string) => string;
  setSearch: (moduleId: string, query: string) => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

// ── Data Context (ref-based, no state re-renders) ───────────────────────────

interface DataContextValue {
  registerData: (moduleId: string, data: unknown[]) => void;
  unregisterData: (moduleId: string) => void;
  registerSelect: (moduleId: string, handler: (item: unknown) => void) => () => void;
  selectItem: (moduleId: string, item: unknown) => void;
  notifyItemSelected: (moduleId: string, item: unknown) => void;
  notifyItemDeselected: (moduleId: string) => void;
  getSelectedItem: (moduleId: string) => unknown | undefined;
  subscribeSelection: (cb: () => void) => () => void;
  subscribeData: (cb: () => void) => () => void;
  getModuleData: () => Map<string, unknown[]>;
}

const DataContext = createContext<DataContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────────

export function ExplorerProvider({ children }: { children: ReactNode }) {
  // Navigation
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const openExplorer = useCallback((moduleId: string) => {
    setOpenModuleId(moduleId);
  }, []);

  const closeExplorer = useCallback(() => {
    setOpenModuleId(null);
  }, []);

  // Filters
  const [filters, setFilters] = useState<Map<string, ActiveFilters>>(new Map());
  const [allSearch, setAllSearch] = useState<Map<string, string>>(new Map());

  const getFilters = useCallback(
    (moduleId: string): ActiveFilters => filters.get(moduleId) ?? EMPTY_FILTERS,
    [filters],
  );

  const setFilter = useCallback((moduleId: string, key: string, value: FilterValue) => {
    setFilters((prev) => {
      const current = prev.get(moduleId) ?? {};
      const next = new Map(prev);
      next.set(moduleId, { ...current, [key]: value });
      return next;
    });
  }, []);

  const clearFilters = useCallback((moduleId: string) => {
    setFilters((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
  }, []);

  const hasActiveFilters = useCallback(
    (moduleId: string): boolean => {
      const f = filters.get(moduleId);
      return f !== undefined && Object.keys(f).length > 0;
    },
    [filters],
  );

  const getSearch = useCallback(
    (moduleId: string): string => allSearch.get(moduleId) ?? "",
    [allSearch],
  );

  const setSearch = useCallback((moduleId: string, query: string) => {
    setAllSearch((prev) => {
      if ((prev.get(moduleId) ?? "") === query) return prev;
      const next = new Map(prev);
      if (query) next.set(moduleId, query);
      else next.delete(moduleId);
      return next;
    });
  }, []);

  // Data registry — ref-based with manual subscriptions to avoid context re-renders
  const moduleDataRef = useRef<Map<string, unknown[]>>(new Map());
  const dataListeners = useRef(new Set<() => void>());

  const subscribeData = useCallback((cb: () => void) => {
    dataListeners.current.add(cb);
    return () => {
      dataListeners.current.delete(cb);
    };
  }, []);

  const getModuleData = useCallback(() => moduleDataRef.current, []);

  const registerData = useCallback((moduleId: string, data: unknown[]) => {
    if (moduleDataRef.current.get(moduleId) === data) return;
    moduleDataRef.current = new Map(moduleDataRef.current);
    moduleDataRef.current.set(moduleId, data);
    for (const cb of dataListeners.current) cb();
  }, []);

  const unregisterData = useCallback((moduleId: string) => {
    if (!moduleDataRef.current.has(moduleId)) return;
    moduleDataRef.current = new Map(moduleDataRef.current);
    moduleDataRef.current.delete(moduleId);
    for (const cb of dataListeners.current) cb();
  }, []);

  // Select handler registry (ref-based to avoid re-renders)
  const selectHandlers = useRef<Map<string, (item: unknown) => void>>(new Map());

  const registerSelect = useCallback((moduleId: string, handler: (item: unknown) => void) => {
    selectHandlers.current.set(moduleId, handler);
    return () => {
      selectHandlers.current.delete(moduleId);
    };
  }, []);

  const selectItem = useCallback((moduleId: string, item: unknown) => {
    selectHandlers.current.get(moduleId)?.(item);
  }, []);

  // Selection notification (lets explorer panel sync its highlight)
  const selectedItemMap = useRef(new Map<string, unknown>());
  const selectionListeners = useRef(new Set<() => void>());

  const subscribeSelection = useCallback((cb: () => void) => {
    selectionListeners.current.add(cb);
    return () => {
      selectionListeners.current.delete(cb);
    };
  }, []);

  const notifyItemSelected = useCallback((moduleId: string, item: unknown) => {
    selectedItemMap.current.set(moduleId, item);
    for (const cb of selectionListeners.current) cb();
  }, []);

  const notifyItemDeselected = useCallback((moduleId: string) => {
    selectedItemMap.current.delete(moduleId);
    for (const cb of selectionListeners.current) cb();
  }, []);

  const getSelectedItem = useCallback((moduleId: string) => {
    return selectedItemMap.current.get(moduleId);
  }, []);

  const navValue = useMemo(
    () => ({ openModuleId, openExplorer, closeExplorer }),
    [openModuleId, openExplorer, closeExplorer],
  );

  const filtersValue = useMemo(
    () => ({ getFilters, setFilter, clearFilters, hasActiveFilters, getSearch, setSearch }),
    [getFilters, setFilter, clearFilters, hasActiveFilters, getSearch, setSearch],
  );

  const dataValue = useMemo(
    () => ({
      registerData,
      unregisterData,
      registerSelect,
      selectItem,
      notifyItemSelected,
      notifyItemDeselected,
      getSelectedItem,
      subscribeSelection,
      subscribeData,
      getModuleData,
    }),
    [
      registerData,
      unregisterData,
      registerSelect,
      selectItem,
      notifyItemSelected,
      notifyItemDeselected,
      getSelectedItem,
      subscribeSelection,
      subscribeData,
      getModuleData,
    ],
  );

  return (
    <NavContext.Provider value={navValue}>
      <FiltersContext.Provider value={filtersValue}>
        <DataContext.Provider value={dataValue}>{children}</DataContext.Provider>
      </FiltersContext.Provider>
    </NavContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useExplorerNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useExplorerNav must be used within ExplorerProvider");
  return ctx;
}

export function useExplorerFiltersCtx() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useExplorerFilters must be used within ExplorerProvider");
  return ctx;
}

export function useExplorerData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useExplorerData must be used within ExplorerProvider");
  return ctx;
}

/** Subscribe to moduleData reactively — only components calling this re-render on data changes. */
export function useModuleDataMap(): Map<string, unknown[]> {
  const { subscribeData, getModuleData } = useExplorerData();
  return useSyncExternalStore(subscribeData, getModuleData);
}

/** Backwards-compatible aggregate hook. Prefer specific hooks for fewer re-renders. */
export function useExplorer() {
  const nav = useExplorerNav();
  const filters = useExplorerFiltersCtx();
  const data = useExplorerData();
  const moduleData = useModuleDataMap();
  return { ...nav, ...filters, ...data, moduleData };
}

// ── Filter predicate hook ────────────────────────────────────────────────────

export function matchesFilter(
  item: Record<string, unknown>,
  field: FilterField,
  value: FilterValue,
): boolean {
  const raw = item[field.key];

  switch (value.type) {
    case "range": {
      const num = typeof raw === "number" ? raw : parseFloat(raw as string);
      if (Number.isNaN(num)) return false;
      return num >= value.min && num <= value.max;
    }
    case "enum": {
      if (value.selected.size === 0) return true;
      return value.selected.has(String(raw ?? ""));
    }
    case "boolean": {
      return Boolean(raw) === value.value;
    }
    case "text": {
      if (!value.value) return true;
      return String(raw ?? "")
        .toLowerCase()
        .includes(value.value.toLowerCase());
    }
  }
}

export function useExplorerFilters(moduleId: string): (item: unknown) => boolean {
  const { getFilters } = useExplorerFiltersCtx();
  const active = getFilters(moduleId);
  const moduleDef = MODULE_REGISTRY.find((m) => m.id === moduleId);
  const schema = moduleDef?.filters;

  const entries = Object.entries(active);
  if (!schema || entries.length === 0) return () => true;

  const fieldMap = new Map(schema.map((f) => [f.key, f]));

  return (item: unknown): boolean => {
    const record = item as Record<string, unknown>;
    for (const [key, value] of entries) {
      const field = fieldMap.get(key);
      if (!field) continue;
      if (!matchesFilter(record, field, value)) return false;
    }
    return true;
  };
}
