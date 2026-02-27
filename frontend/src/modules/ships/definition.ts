import { Ship } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const ShipsLayer = lazy(() => import("./ships-layer").then(m => ({ default: m.ShipsLayer })));

export const shipsModule: ModuleDefinition = {
  id: "ships",
  name: "Vessels",
  category: "Tracking",
  icon: Ship,
  focusZoom: FOCUS_ZOOM["ships"],
  MapLayer: ShipsLayer,
  source: { name: "AIS Vessel Data", url: "https://www.marinetraffic.com" },
};
