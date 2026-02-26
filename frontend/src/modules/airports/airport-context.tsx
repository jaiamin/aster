import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Airport, SelectedAirport } from "@/types/airports";
import { useModuleSelection } from "@/modules/module-context";

interface AirportSelectionContextValue {
  selected: SelectedAirport | null;
  select: (airport: Airport) => void;
  deselect: () => void;
}

const AirportSelectionContext = createContext<AirportSelectionContextValue | null>(null);

export function AirportSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selected, setSelected] = useState<SelectedAirport | null>(null);

  const select = useCallback((airport: Airport) => {
    notifySelected("airports");
    setSelected({ airport });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("airports", deselect);
    return () => unregisterDeselect("airports");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <AirportSelectionContext value={{ selected, select, deselect }}>
      {children}
    </AirportSelectionContext>
  );
}

export function useAirportSelection() {
  const ctx = useContext(AirportSelectionContext);
  if (!ctx) throw new Error("useAirportSelection must be used within AirportSelectionProvider");
  return ctx;
}
