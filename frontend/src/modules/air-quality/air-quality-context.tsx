import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AirQualityStation, SelectedStation } from "@/types/air-quality";
import { useModuleSelection } from "@/modules/module-context";

interface AirQualitySelectionContextValue {
  selected: SelectedStation | null;
  select: (station: AirQualityStation) => void;
  deselect: () => void;
}

const AirQualitySelectionContext = createContext<AirQualitySelectionContextValue | null>(null);

export function AirQualitySelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selected, setSelected] = useState<SelectedStation | null>(null);

  const select = useCallback((station: AirQualityStation) => {
    notifySelected("air-quality");
    setSelected({ station });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("air-quality", deselect);
    return () => unregisterDeselect("air-quality");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <AirQualitySelectionContext value={{ selected, select, deselect }}>
      {children}
    </AirQualitySelectionContext>
  );
}

export function useAirQualitySelection() {
  const ctx = useContext(AirQualitySelectionContext);
  if (!ctx) throw new Error("useAirQualitySelection must be used within AirQualitySelectionProvider");
  return ctx;
}
