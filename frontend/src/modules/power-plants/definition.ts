import { Zap } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const PowerPlantsLayer = lazy(() => import("./power-plants-layer").then(m => ({ default: m.PowerPlantsLayer })));

export const powerPlantsModule: ModuleDefinition = {
  id: "power-plants",
  name: "Power Plants",
  category: "Infrastructure",
  icon: Zap,
  focusZoom: FOCUS_ZOOM["power-plants"],
  MapLayer: PowerPlantsLayer,
};
