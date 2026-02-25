import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Port, SelectedPort } from "@/types/ports";
import { useModules } from "@/modules/module-context";

interface PortSelectionContextValue {
  selected: SelectedPort | null;
  select: (port: Port) => void;
  deselect: () => void;
}

const PortSelectionContext = createContext<PortSelectionContextValue | null>(null);

export function PortSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, notifySelected } = useModules();
  const [selected, setSelected] = useState<SelectedPort | null>(null);

  const select = useCallback((port: Port) => {
    notifySelected("ports");
    setSelected({ port });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => { registerDeselect("ports", deselect); }, [registerDeselect, deselect]);

  return (
    <PortSelectionContext value={{ selected, select, deselect }}>
      {children}
    </PortSelectionContext>
  );
}

export function usePortSelection() {
  const ctx = useContext(PortSelectionContext);
  if (!ctx) throw new Error("usePortSelection must be used within PortSelectionProvider");
  return ctx;
}
