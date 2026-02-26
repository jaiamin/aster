import { Radiation } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { NuclearLayer } from "./nuclear-layer";

export const nuclearModule: ModuleDefinition = {
  id: "nuclear",
  name: "Nuclear Facilities",
  category: "Infrastructure",
  icon: Radiation,
  focusZoom: FOCUS_ZOOM["nuclear"],
  MapLayer: NuclearLayer,
};
