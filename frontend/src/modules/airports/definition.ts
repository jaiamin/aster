import { PlaneTakeoff } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { AirportsLayer } from "./airports-layer";

export const airportsModule: ModuleDefinition = {
  id: "airports",
  name: "Airports",
  category: "Transportation",
  icon: PlaneTakeoff,
  focusZoom: FOCUS_ZOOM["airports"],
  MapLayer: AirportsLayer,
};
