import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Airport, SelectedAirport } from "@/types/airports";

const { Provider: AirportSelectionProvider, useSelection: useAirportSelection } =
  createSelectionContext<Airport, SelectedAirport>({
    moduleId: "airports",
    wrap: (airport) => ({ airport }),
  });

export { AirportSelectionProvider, useAirportSelection };
