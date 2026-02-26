import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Buoy, SelectedBuoy } from "@/types/buoys";
import { useModuleSelection } from "@/modules/module-context";

interface BuoySelectionContextValue {
  selected: SelectedBuoy | null;
  select: (buoy: Buoy) => void;
  deselect: () => void;
}

const BuoySelectionContext = createContext<BuoySelectionContextValue | null>(null);

export function BuoySelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selected, setSelected] = useState<SelectedBuoy | null>(null);

  const select = useCallback((buoy: Buoy) => {
    notifySelected("buoys");
    setSelected({ buoy });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("buoys", deselect);
    return () => unregisterDeselect("buoys");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <BuoySelectionContext value={{ selected, select, deselect }}>
      {children}
    </BuoySelectionContext>
  );
}

export function useBuoySelection() {
  const ctx = useContext(BuoySelectionContext);
  if (!ctx) throw new Error("useBuoySelection must be used within BuoySelectionProvider");
  return ctx;
}
