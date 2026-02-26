import { Navigation } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { BuoysLayer } from "./buoys-layer";

export const buoysModule: ModuleDefinition = {
  id: "buoys",
  name: "Ocean Buoys",
  category: "Environment",
  icon: Navigation,
  focusZoom: FOCUS_ZOOM["buoys"],
  MapLayer: BuoysLayer,
};
