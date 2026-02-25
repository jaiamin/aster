import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ModuleContextValue {
  enabledModules: Set<string>;
  toggle: (id: string) => void;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setEnabledModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <ModuleContext.Provider value={{ enabledModules, toggle }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModules must be used within ModuleProvider");
  return ctx;
}
