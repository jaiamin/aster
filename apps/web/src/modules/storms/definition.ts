import { CloudLightning } from "lucide-react";
import { lazy } from "react";

import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { ModuleDefinition } from "@/types/modules";
const StormsLayer = lazy(() => import("./storms-layer").then((m) => ({ default: m.StormsLayer })));

export const stormsModule: ModuleDefinition = {
  id: "storms",
  name: "Storms",
  category: "Events",
  icon: CloudLightning,
  focusZoom: FOCUS_ZOOM["storms"],
  MapLayer: StormsLayer,
  source: { name: "NOAA NHC", url: "https://www.nhc.noaa.gov" },
  nameKey: "name",
  filters: [
    { key: "category", label: "Category", type: "range", min: 0, max: 5 },
    { key: "basin", label: "Basin", type: "enum" },
    { key: "windSpeed", label: "Wind Speed", type: "range", min: 0, max: 200, unit: "kt" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "category", label: "Cat", width: "40px", align: "right" },
    { key: "windSpeed", label: "Wind", width: "56px", align: "right" },
  ],
};
