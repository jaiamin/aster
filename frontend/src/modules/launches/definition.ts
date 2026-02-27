import { Rocket } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const LaunchesLayer = lazy(() => import("./launches-layer").then(m => ({ default: m.LaunchesLayer })));

export const launchesModule: ModuleDefinition = {
  id: "launches",
  name: "Rocket Launch Sites",
  category: "Events",
  icon: Rocket,
  focusZoom: FOCUS_ZOOM["launches"],
  MapLayer: LaunchesLayer,
  source: { name: "Launch Library", url: "https://thespacedevs.com" },
};
