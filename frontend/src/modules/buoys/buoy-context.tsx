import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Buoy, SelectedBuoy } from "@/types/buoys";

const { Provider: BuoySelectionProvider, useSelection: useBuoySelection } =
  createSelectionContext<Buoy, SelectedBuoy>({
    moduleId: "buoys",
    wrap: (buoy) => ({ buoy }),
  });

export { BuoySelectionProvider, useBuoySelection };
