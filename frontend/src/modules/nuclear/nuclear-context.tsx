import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { NuclearFacility, SelectedFacility } from "@/types/nuclear";
import { useModules } from "@/modules/module-context";

interface NuclearSelectionContextValue {
  selected: SelectedFacility | null;
  select: (facility: NuclearFacility) => void;
  deselect: () => void;
}

const NuclearSelectionContext = createContext<NuclearSelectionContextValue | null>(null);

export function NuclearSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModules();
  const [selected, setSelected] = useState<SelectedFacility | null>(null);

  const select = useCallback((facility: NuclearFacility) => {
    notifySelected("nuclear");
    setSelected({ facility });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("nuclear", deselect);
    return () => unregisterDeselect("nuclear");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <NuclearSelectionContext value={{ selected, select, deselect }}>
      {children}
    </NuclearSelectionContext>
  );
}

export function useNuclearSelection() {
  const ctx = useContext(NuclearSelectionContext);
  if (!ctx) throw new Error("useNuclearSelection must be used within NuclearSelectionProvider");
  return ctx;
}
