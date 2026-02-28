import { createSelectionContext } from "@/hooks/create-selection-context";
import type { AirQualityStation, SelectedStation } from "@/types/air-quality";

const { Provider: AirQualitySelectionProvider, useSelection: useAirQualitySelection } =
  createSelectionContext<AirQualityStation, SelectedStation>({
    moduleId: "air-quality",
    wrap: (station) => ({ station }),
  });

export { AirQualitySelectionProvider, useAirQualitySelection };
