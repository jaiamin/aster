import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Volcano, SelectedVolcano } from "@/types/volcanoes";

const { Provider: VolcanoSelectionProvider, useSelection: useVolcanoSelection } =
  createSelectionContext<Volcano, SelectedVolcano>({
    moduleId: "volcanoes",
    wrap: (volcano) => ({ volcano }),
  });

export { VolcanoSelectionProvider, useVolcanoSelection };
