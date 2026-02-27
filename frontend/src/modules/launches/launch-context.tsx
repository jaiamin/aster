import { createSelectionContext } from "@/hooks/create-selection-context";
import type { Launch, SelectedLaunch } from "@/types/launches";

const { Provider: LaunchSelectionProvider, useSelection: useLaunchSelection } =
  createSelectionContext<Launch, SelectedLaunch>({
    moduleId: "launches",
    wrap: (launch) => ({ launch }),
  });

export { LaunchSelectionProvider, useLaunchSelection };
