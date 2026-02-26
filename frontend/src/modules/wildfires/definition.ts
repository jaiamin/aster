import { Flame } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const WildfiresLayer = lazy(() => import("./wildfires-layer").then(m => ({ default: m.WildfiresLayer })));

export const wildfiresModule: ModuleDefinition = {
  id: "wildfires",
  name: "Wildfires",
  category: "Natural Events",
  icon: Flame,
  focusZoom: FOCUS_ZOOM["wildfires"],
  MapLayer: WildfiresLayer,
};
