import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Wildfire, SelectedWildfire } from "@/types/wildfires";
import { useModuleSelection } from "@/modules/module-context";

interface WildfireSelectionContextValue {
  selected: SelectedWildfire | null;
  select: (fire: Wildfire) => void;
  deselect: () => void;
}

const WildfireSelectionContext = createContext<WildfireSelectionContextValue | null>(null);

export function WildfireSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selected, setSelected] = useState<SelectedWildfire | null>(null);

  const select = useCallback((fire: Wildfire) => {
    notifySelected("wildfires");
    setSelected({ fire });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("wildfires", deselect);
    return () => unregisterDeselect("wildfires");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <WildfireSelectionContext value={{ selected, select, deselect }}>
      {children}
    </WildfireSelectionContext>
  );
}

export function useWildfireSelection() {
  const ctx = useContext(WildfireSelectionContext);
  if (!ctx) throw new Error("useWildfireSelection must be used within WildfireSelectionProvider");
  return ctx;
}
