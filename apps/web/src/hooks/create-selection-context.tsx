import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useExplorerData } from "@/modules/explorer-context";
import { useModuleSelection } from "@/modules/module-context";

export function createSelectionContext<TItem, TSelected>({
  moduleId,
  wrap,
}: {
  moduleId: string;
  wrap: (item: TItem) => TSelected;
}) {
  const Context = createContext<{
    selected: TSelected | null;
    select: (item: TItem) => void;
    deselect: () => void;
  } | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
    const { notifyItemSelected, notifyItemDeselected } = useExplorerData();
    const [selected, setSelected] = useState<TSelected | null>(null);

    const select = useCallback(
      (item: TItem) => {
        notifySelected(moduleId);
        notifyItemSelected(moduleId, item);
        setSelected(wrap(item));
      },
      [notifySelected, notifyItemSelected],
    );

    const deselect = useCallback(() => {
      setSelected(null);
      notifyItemDeselected(moduleId);
    }, [notifyItemDeselected]);

    useEffect(() => {
      registerDeselect(moduleId, deselect);
      return () => unregisterDeselect(moduleId);
    }, [registerDeselect, unregisterDeselect, deselect]);

    const value = useMemo(() => ({ selected, select, deselect }), [selected, select, deselect]);
    return <Context value={value}>{children}</Context>;
  }

  function useSelection() {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`useSelection: missing Provider for ${moduleId}`);
    return ctx;
  }

  return { Provider, useSelection } as const;
}
