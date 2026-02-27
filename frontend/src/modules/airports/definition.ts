import { PlaneTakeoff } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const AirportsLayer = lazy(() => import("./airports-layer").then(m => ({ default: m.AirportsLayer })));

export const airportsModule: ModuleDefinition = {
  id: "airports",
  name: "Airports",
  category: "Transportation",
  icon: PlaneTakeoff,
  focusZoom: FOCUS_ZOOM["airports"],
  MapLayer: AirportsLayer,
  source: { name: "OurAirports", url: "https://ourairports.com" },
};
