import { Activity } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const EarthquakesLayer = lazy(() => import("./earthquakes-layer").then(m => ({ default: m.EarthquakesLayer })));

export const earthquakesModule: ModuleDefinition = {
  id: "earthquakes",
  name: "Earthquakes",
  category: "Events",
  icon: Activity,
  focusZoom: FOCUS_ZOOM["earthquakes"],
  MapLayer: EarthquakesLayer,
  source: { name: "USGS", url: "https://earthquake.usgs.gov" },
};
