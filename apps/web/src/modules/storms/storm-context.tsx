import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Storm, SelectedStorm } from "@/types/storms";

const { Provider: StormSelectionProvider, useSelection: useStormSelection } =
  createSelectionContext<Storm, SelectedStorm>({
    moduleId: "storms",
    wrap: (storm) => ({ storm }),
  });

export { StormSelectionProvider, useStormSelection };
