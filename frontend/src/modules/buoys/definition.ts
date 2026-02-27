import { Navigation } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const BuoysLayer = lazy(() => import("./buoys-layer").then(m => ({ default: m.BuoysLayer })));

export const buoysModule: ModuleDefinition = {
  id: "buoys",
  name: "Ocean Buoys",
  category: "Environment",
  icon: Navigation,
  focusZoom: FOCUS_ZOOM["buoys"],
  MapLayer: BuoysLayer,
  source: { name: "NOAA NDBC", url: "https://www.ndbc.noaa.gov" },
};
