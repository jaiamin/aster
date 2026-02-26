import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Volcano, SelectedVolcano } from "@/types/volcanoes";
import { useModules } from "@/modules/module-context";

interface VolcanoSelectionContextValue {
  selected: SelectedVolcano | null;
  select: (volcano: Volcano) => void;
  deselect: () => void;
}

const VolcanoSelectionContext = createContext<VolcanoSelectionContextValue | null>(null);

export function VolcanoSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModules();
  const [selected, setSelected] = useState<SelectedVolcano | null>(null);

  const select = useCallback((volcano: Volcano) => {
    notifySelected("volcanoes");
    setSelected({ volcano });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("volcanoes", deselect);
    return () => unregisterDeselect("volcanoes");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <VolcanoSelectionContext value={{ selected, select, deselect }}>
      {children}
    </VolcanoSelectionContext>
  );
}

export function useVolcanoSelection() {
  const ctx = useContext(VolcanoSelectionContext);
  if (!ctx) throw new Error("useVolcanoSelection must be used within VolcanoSelectionProvider");
  return ctx;
}
