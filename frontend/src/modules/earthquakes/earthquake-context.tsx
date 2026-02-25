import { createContext, useCallback, useContext, useState } from "react";
import type { Earthquake, SelectedEarthquake } from "@/types/earthquakes";

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
  const [selected, setSelected] = useState<SelectedEarthquake | null>(null);

  const select = useCallback((quake: Earthquake) => {
    setSelected({ quake });
  }, []);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

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
