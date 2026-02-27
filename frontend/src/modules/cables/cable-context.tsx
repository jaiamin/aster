import { createSelectionContext } from "@/hooks/create-selection-context";
import type { CableFeature, SelectedCable } from "@/types/cables";

const { Provider: CableSelectionProvider, useSelection: useCableSelection } =
  createSelectionContext<CableFeature, SelectedCable>({
    moduleId: "cables",
    wrap: (cable) => ({ cable }),
  });

export { CableSelectionProvider, useCableSelection };
