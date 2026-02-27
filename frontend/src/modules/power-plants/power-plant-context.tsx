import { createSelectionContext } from "@/hooks/create-selection-context";
import type { PowerPlant, SelectedPowerPlant } from "@/types/power-plants";

const { Provider: PowerPlantSelectionProvider, useSelection: usePowerPlantSelection } =
  createSelectionContext<PowerPlant, SelectedPowerPlant>({
    moduleId: "power-plants",
    wrap: (plant) => ({ plant }),
  });

export { PowerPlantSelectionProvider, usePowerPlantSelection };
