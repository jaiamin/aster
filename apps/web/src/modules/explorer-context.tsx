import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
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

// ── Context ──────────────────────────────────────────────────────────────────

interface ExplorerContextValue {
  openModuleId: string | null;
  openExplorer: (moduleId: string) => void;
  closeExplorer: () => void;

  getFilters: (moduleId: string) => ActiveFilters;
  setFilter: (moduleId: string, key: string, value: FilterValue) => void;
  clearFilters: (moduleId: string) => void;
  hasActiveFilters: (moduleId: string) => boolean;

  getSearch: (moduleId: string) => string;
  setSearch: (moduleId: string, query: string) => void;

  moduleData: Map<string, unknown[]>;
  registerData: (moduleId: string, data: unknown[]) => void;
  unregisterData: (moduleId: string) => void;

  registerSelect: (moduleId: string, handler: (item: unknown) => void) => () => void;
  selectItem: (moduleId: string, item: unknown) => void;
}

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function ExplorerProvider({ children }: { children: ReactNode }) {
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Map<string, ActiveFilters>>(new Map());
  const [allSearch, setAllSearch] = useState<Map<string, string>>(new Map());
  const [moduleData, setModuleData] = useState<Map<string, unknown[]>>(new Map());

  const openExplorer = useCallback((moduleId: string) => {
    setOpenModuleId(moduleId);
  }, []);

  const closeExplorer = useCallback(() => {
    setOpenModuleId(null);
  }, []);

  // Filters
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

  // Search
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

  // Data registry
  const registerData = useCallback((moduleId: string, data: unknown[]) => {
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

  const value = useMemo(
    () => ({
      openModuleId,
      openExplorer,
      closeExplorer,
      getFilters,
      setFilter,
      clearFilters,
      hasActiveFilters,
      getSearch,
      setSearch,
      moduleData,
      registerData,
      unregisterData,
      registerSelect,
      selectItem,
    }),
    [
      openModuleId,
      openExplorer,
      closeExplorer,
      getFilters,
      setFilter,
      clearFilters,
      hasActiveFilters,
      getSearch,
      setSearch,
      moduleData,
      registerData,
      unregisterData,
      registerSelect,
      selectItem,
    ],
  );

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useExplorer() {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error("useExplorer must be used within ExplorerProvider");
  return ctx;
}

// ── Filter predicate hook ────────────────────────────────────────────────────

function matchesFilter(
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
  const { getFilters } = useExplorer();
  const active = getFilters(moduleId);
  const moduleDef = MODULE_REGISTRY.find((m) => m.id === moduleId);
  const schema = moduleDef?.filters;

  return useMemo(() => {
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
  }, [active, schema]);
}
