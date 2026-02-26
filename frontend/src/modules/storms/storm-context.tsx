import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Storm, SelectedStorm } from "@/types/storms";
import { useModuleSelection } from "@/modules/module-context";

interface StormSelectionContextValue {
  selected: SelectedStorm | null;
  select: (storm: Storm) => void;
  deselect: () => void;
}

const StormSelectionContext = createContext<StormSelectionContextValue | null>(null);

export function StormSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selected, setSelected] = useState<SelectedStorm | null>(null);

  const select = useCallback((storm: Storm) => {
    notifySelected("storms");
    setSelected({ storm });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("storms", deselect);
    return () => unregisterDeselect("storms");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <StormSelectionContext value={{ selected, select, deselect }}>
      {children}
    </StormSelectionContext>
  );
}

export function useStormSelection() {
  const ctx = useContext(StormSelectionContext);
  if (!ctx) throw new Error("useStormSelection must be used within StormSelectionProvider");
  return ctx;
}
