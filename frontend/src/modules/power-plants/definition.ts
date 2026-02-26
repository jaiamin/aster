import { Zap } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { PowerPlantsLayer } from "./power-plants-layer";

export const powerPlantsModule: ModuleDefinition = {
  id: "power-plants",
  name: "Power Plants",
  category: "Infrastructure",
  icon: Zap,
  focusZoom: FOCUS_ZOOM["power-plants"],
  MapLayer: PowerPlantsLayer,
};
