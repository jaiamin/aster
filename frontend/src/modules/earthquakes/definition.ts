import { Activity } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { EarthquakesLayer } from "./earthquakes-layer";

export const earthquakesModule: ModuleDefinition = {
  id: "earthquakes",
  name: "Earthquakes",
  category: "Natural Events",
  icon: Activity,
  focusZoom: FOCUS_ZOOM["earthquakes"],
  MapLayer: EarthquakesLayer,
};
