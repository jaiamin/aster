import { Plane } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { FlightsLayer } from "./flights-layer";

export const flightsModule: ModuleDefinition = {
  id: "flights",
  name: "Flights",
  category: "Transportation",
  icon: Plane,
  focusZoom: FOCUS_ZOOM["flights"],
  MapLayer: FlightsLayer,
};
