import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface PendingTarget {
  moduleId: string;
  targetId: number;
}

interface ModuleContextValue {
  enabledModules: Set<string>;
  pendingTarget: PendingTarget | null;
  toggle: (id: string) => void;
  focusTarget: (moduleId: string, targetId: number) => void;
  clearPendingTarget: () => void;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);

  const toggle = useCallback((id: string) => {
    setEnabledModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const focusTarget = useCallback((moduleId: string, targetId: number) => {
    // Ensure module is enabled, then set the pending target
    setEnabledModules((prev) => {
      if (prev.has(moduleId)) return prev;
      return new Set(prev).add(moduleId);
    });
    setPendingTarget({ moduleId, targetId });
  }, []);

  const clearPendingTarget = useCallback(() => setPendingTarget(null), []);

  return (
    <ModuleContext.Provider value={{ enabledModules, pendingTarget, toggle, focusTarget, clearPendingTarget }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModules must be used within ModuleProvider");
  return ctx;
}
