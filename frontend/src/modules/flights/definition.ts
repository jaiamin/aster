import { Plane } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const FlightsLayer = lazy(() => import("./flights-layer").then(m => ({ default: m.FlightsLayer })));

export const flightsModule: ModuleDefinition = {
  id: "flights",
  name: "Flights",
  category: "Tracking",
  icon: Plane,
  focusZoom: FOCUS_ZOOM["flights"],
  MapLayer: FlightsLayer,
  source: { name: "OpenSky Network", url: "https://opensky-network.org" },
};
