import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PowerPlant, SelectedPowerPlant } from "@/types/power-plants";
import { useModules } from "@/modules/module-context";

interface PowerPlantSelectionContextValue {
  selected: SelectedPowerPlant | null;
  select: (plant: PowerPlant) => void;
  deselect: () => void;
}

const PowerPlantSelectionContext = createContext<PowerPlantSelectionContextValue | null>(null);

export function PowerPlantSelectionProvider({ children }: { children: React.ReactNode }) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModules();
  const [selected, setSelected] = useState<SelectedPowerPlant | null>(null);

  const select = useCallback((plant: PowerPlant) => {
    notifySelected("power-plants");
    setSelected({ plant });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("power-plants", deselect);
    return () => unregisterDeselect("power-plants");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <PowerPlantSelectionContext value={{ selected, select, deselect }}>
      {children}
    </PowerPlantSelectionContext>
  );
}

export function usePowerPlantSelection() {
  const ctx = useContext(PowerPlantSelectionContext);
  if (!ctx) throw new Error("usePowerPlantSelection must be used within PowerPlantSelectionProvider");
  return ctx;
}
