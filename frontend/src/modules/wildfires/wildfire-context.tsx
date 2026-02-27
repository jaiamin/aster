import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Wildfire, SelectedWildfire } from "@/types/wildfires";

const { Provider: WildfireSelectionProvider, useSelection: useWildfireSelection } =
  createSelectionContext<Wildfire, SelectedWildfire>({
    moduleId: "wildfires",
    wrap: (fire) => ({ fire }),
  });

export { WildfireSelectionProvider, useWildfireSelection };
