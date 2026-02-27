import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Earthquake, SelectedEarthquake } from "@/types/earthquakes";

const { Provider: EarthquakeSelectionProvider, useSelection: useEarthquakeSelection } =
  createSelectionContext<Earthquake, SelectedEarthquake>({
    moduleId: "earthquakes",
    wrap: (quake) => ({ quake }),
  });

export { EarthquakeSelectionProvider, useEarthquakeSelection };
