import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CableFeature, SelectedCable } from "@/types/cables";
import { useModuleSelection } from "@/modules/module-context";

interface CableSelectionContextValue {
  selected: SelectedCable | null;
  select: (cable: CableFeature) => void;
  deselect: () => void;
}

const CableSelectionContext = createContext<CableSelectionContextValue | null>(null);

export function CableSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selected, setSelected] = useState<SelectedCable | null>(null);

  const select = useCallback((cable: CableFeature) => {
    notifySelected("cables");
    setSelected({ cable });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("cables", deselect);
    return () => unregisterDeselect("cables");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <CableSelectionContext value={{ selected, select, deselect }}>
      {children}
    </CableSelectionContext>
  );
}

export function useCableSelection() {
  const ctx = useContext(CableSelectionContext);
  if (!ctx) throw new Error("useCableSelection must be used within CableSelectionProvider");
  return ctx;
}
