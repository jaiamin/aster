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
  filters: [
    { key: "category", label: "Category", type: "range", min: 0, max: 5 },
    { key: "basin", label: "Basin", type: "enum" },
    { key: "windSpeed", label: "Wind Speed", type: "range", min: 0, max: 200, unit: "kt" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "category", label: "Cat", width: "40px" },
    { key: "windSpeed", label: "Wind", width: "56px" },
  ],
};
