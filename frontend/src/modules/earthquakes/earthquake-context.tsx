import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Earthquake, SelectedEarthquake } from "@/types/earthquakes";
import { useModuleSelection } from "@/modules/module-context";

interface EarthquakeSelectionContextValue {
  selected: SelectedEarthquake | null;
  select: (quake: Earthquake) => void;
  deselect: () => void;
}

const EarthquakeSelectionContext = createContext<EarthquakeSelectionContextValue | null>(null);

export function EarthquakeSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selected, setSelected] = useState<SelectedEarthquake | null>(null);

  const select = useCallback((quake: Earthquake) => {
    notifySelected("earthquakes");
    setSelected({ quake });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("earthquakes", deselect);
    return () => unregisterDeselect("earthquakes");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <EarthquakeSelectionContext value={{ selected, select, deselect }}>
      {children}
    </EarthquakeSelectionContext>
  );
}

export function useEarthquakeSelection() {
  const ctx = useContext(EarthquakeSelectionContext);
  if (!ctx) throw new Error("useEarthquakeSelection must be used within EarthquakeSelectionProvider");
  return ctx;
}
