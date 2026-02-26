import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { getInitialLayers } from "@/lib/url-state";

export interface PendingTarget {
  moduleId: string;
  targetId: number;
}

type DeselectFn = () => void;

interface ModuleContextValue {
  enabledModules: Set<string>;
  moduleCounts: Map<string, number>;
  pendingTarget: PendingTarget | null;
  toggle: (id: string) => void;
  focusTarget: (moduleId: string, targetId: number) => void;
  clearPendingTarget: () => void;
  registerDeselect: (moduleId: string, deselect: DeselectFn) => void;
  notifySelected: (moduleId: string) => void;
  registerCount: (moduleId: string, count: number) => void;
  unregisterCount: (moduleId: string) => void;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(getInitialLayers);
  const [moduleCounts, setModuleCounts] = useState<Map<string, number>>(new Map());
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);
  const deselectMap = useRef(new Map<string, DeselectFn>());

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

  const clearPendingTarget = useCallback(() => setPendingTarget(null), []);

  const registerDeselect = useCallback((moduleId: string, deselect: DeselectFn) => {
    deselectMap.current.set(moduleId, deselect);
  }, []);

  const notifySelected = useCallback((moduleId: string) => {
    for (const [id, deselect] of deselectMap.current) {
      if (id !== moduleId) deselect();
    }
  }, []);

  const registerCount = useCallback((moduleId: string, count: number) => {
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

  return (
    <ModuleContext.Provider value={{ enabledModules, moduleCounts, pendingTarget, toggle, focusTarget, clearPendingTarget, registerDeselect, notifySelected, registerCount, unregisterCount }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModules must be used within ModuleProvider");
  return ctx;
}
