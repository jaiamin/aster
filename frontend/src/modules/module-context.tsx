import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export interface PendingTarget {
  moduleId: string;
  targetId: number;
}

type DeselectFn = () => void;

interface ModuleContextValue {
  enabledModules: Set<string>;
  pendingTarget: PendingTarget | null;
  toggle: (id: string) => void;
  focusTarget: (moduleId: string, targetId: number) => void;
  clearPendingTarget: () => void;
  registerDeselect: (moduleId: string, deselect: DeselectFn) => void;
  notifySelected: (moduleId: string) => void;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
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

  return (
    <ModuleContext.Provider value={{ enabledModules, pendingTarget, toggle, focusTarget, clearPendingTarget, registerDeselect, notifySelected }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModules must be used within ModuleProvider");
  return ctx;
}
