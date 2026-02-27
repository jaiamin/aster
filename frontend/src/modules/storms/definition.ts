import { CloudLightning } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const StormsLayer = lazy(() => import("./storms-layer").then(m => ({ default: m.StormsLayer })));

export const stormsModule: ModuleDefinition = {
  id: "storms",
  name: "Storms",
  category: "Events",
  icon: CloudLightning,
  focusZoom: FOCUS_ZOOM["storms"],
  MapLayer: StormsLayer,
  source: { name: "NOAA NHC", url: "https://www.nhc.noaa.gov" },
};
