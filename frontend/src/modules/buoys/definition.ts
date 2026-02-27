import { Navigation } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const BuoysLayer = lazy(() => import("./buoys-layer").then(m => ({ default: m.BuoysLayer })));

export const buoysModule: ModuleDefinition = {
  id: "buoys",
  name: "Ocean Buoys",
  category: "Environment",
  icon: Navigation,
  focusZoom: FOCUS_ZOOM["buoys"],
  MapLayer: BuoysLayer,
  source: { name: "NOAA NDBC", url: "https://www.ndbc.noaa.gov" },
  nameKey: "id",
  filters: [
    { key: "waveHeight", label: "Wave Height", type: "range", min: 0, max: 15, unit: "m" },
    { key: "waterTemp", label: "Water Temp", type: "range", min: -2, max: 35, unit: "°C" },
    { key: "windSpeed", label: "Wind Speed", type: "range", min: 0, max: 60, unit: "kts" },
  ],
  listColumns: [
    { key: "id", label: "Buoy ID" },
    { key: "waveHeight", label: "Waves (m)", width: "72px", align: "right" },
    { key: "windSpeed", label: "Wind", width: "56px", align: "right" },
  ],
};
