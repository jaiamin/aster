import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Port, SelectedPort } from "@/types/ports";

const { Provider: PortSelectionProvider, useSelection: usePortSelection } = createSelectionContext<
  Port,
  SelectedPort
>({
  moduleId: "ports",
  wrap: (port) => ({ port }),
});

export { PortSelectionProvider, usePortSelection };
