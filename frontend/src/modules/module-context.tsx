import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { getInitialLayers, getInitialSearchQuery, getInitialTimeFilter } from "@/lib/url-state";
import type { TimePreset } from "@/lib/time-filter";

// ── Toggle Context ──────────────────────────────────────────────────────────

export interface PendingTarget {
  moduleId: string;
  targetId: number;
}

interface ToggleContextValue {
  enabledModules: Set<string>;
  toggle: (id: string) => void;
  focusTarget: (moduleId: string, targetId: number) => void;
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
  pendingTarget: PendingTarget | null;
  clearPendingTarget: () => void;
  registerDeselect: (moduleId: string, deselect: DeselectFn) => void;
  unregisterDeselect: (moduleId: string) => void;
  notifySelected: (moduleId: string) => void;
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

// ── Provider ────────────────────────────────────────────────────────────────

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(getInitialLayers);
  const [moduleCounts, setModuleCounts] = useState<Map<string, number | null>>(new Map());
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [timeFilter, setTimeFilter] = useState<TimePreset>(getInitialTimeFilter);
  const deselectMap = useRef(new Map<string, DeselectFn>());

  // Toggle
  const toggle = useCallback((id: string) => {
    setEnabledModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const focusTarget = useCallback((moduleId: string, targetId: number) => {
    setEnabledModules((prev) => {
      if (prev.has(moduleId)) return prev;
      return new Set(prev).add(moduleId);
    });
    setPendingTarget({ moduleId, targetId });
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
  const clearPendingTarget = useCallback(() => setPendingTarget(null), []);

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

  return (
    <ToggleContext.Provider value={{ enabledModules, toggle, focusTarget }}>
      <CountsContext.Provider value={{ moduleCounts, registerCount, unregisterCount }}>
        <SelectionContext.Provider value={{ pendingTarget, clearPendingTarget, registerDeselect, unregisterDeselect, notifySelected }}>
          <FilterContext.Provider value={{ searchQuery, timeFilter, setSearchQuery, setTimeFilter }}>
            {children}
          </FilterContext.Provider>
        </SelectionContext.Provider>
      </CountsContext.Provider>
    </ToggleContext.Provider>
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

/** Legacy hook — returns all fields for backward compatibility. Prefer specific hooks. */
export function useModules() {
  const { enabledModules, toggle, focusTarget } = useModuleToggle();
  const { moduleCounts, registerCount, unregisterCount } = useModuleCounts();
  const { pendingTarget, clearPendingTarget, registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const { searchQuery, timeFilter, setSearchQuery, setTimeFilter } = useModuleFilter();

  return {
    enabledModules, moduleCounts, pendingTarget, searchQuery, timeFilter,
    toggle, focusTarget, clearPendingTarget,
    registerDeselect, unregisterDeselect, notifySelected,
    registerCount, unregisterCount,
    setSearchQuery, setTimeFilter,
  };
}
