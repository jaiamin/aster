import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Launch, SelectedLaunch } from "@/types/launches";
import { useModules } from "@/modules/module-context";

interface LaunchSelectionContextValue {
  selected: SelectedLaunch | null;
  select: (launch: Launch) => void;
  deselect: () => void;
}

const LaunchSelectionContext = createContext<LaunchSelectionContextValue | null>(null);

export function LaunchSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModules();
  const [selected, setSelected] = useState<SelectedLaunch | null>(null);

  const select = useCallback((launch: Launch) => {
    notifySelected("launches");
    setSelected({ launch });
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    registerDeselect("launches", deselect);
    return () => unregisterDeselect("launches");
  }, [registerDeselect, unregisterDeselect, deselect]);

  return (
    <LaunchSelectionContext value={{ selected, select, deselect }}>
      {children}
    </LaunchSelectionContext>
  );
}

export function useLaunchSelection() {
  const ctx = useContext(LaunchSelectionContext);
  if (!ctx) throw new Error("useLaunchSelection must be used within LaunchSelectionProvider");
  return ctx;
}
