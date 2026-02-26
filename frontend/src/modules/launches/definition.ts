import { Rocket } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { LaunchesLayer } from "./launches-layer";

export const launchesModule: ModuleDefinition = {
  id: "launches",
  name: "Rocket Launches",
  category: "Space",
  icon: Rocket,
  focusZoom: FOCUS_ZOOM["launches"],
  MapLayer: LaunchesLayer,
};
