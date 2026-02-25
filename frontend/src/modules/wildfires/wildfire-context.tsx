import { createContext, useCallback, useContext, useState } from "react";
import type { Wildfire, SelectedWildfire } from "@/types/wildfires";

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
  const [selected, setSelected] = useState<SelectedWildfire | null>(null);

  const select = useCallback((fire: Wildfire) => {
    setSelected({ fire });
  }, []);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

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
