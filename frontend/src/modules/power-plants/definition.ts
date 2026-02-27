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
  source: { name: "WRI Global Power Plant Database", url: "https://datasets.wri.org/datasets/global-power-plant-database" },
  filters: [
    { key: "fuelType", label: "Fuel Type", type: "enum" },
    { key: "capacityMw", label: "Capacity", type: "range", min: 0, max: 10000, unit: "MW" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "fuelType", label: "Fuel", width: "64px" },
    { key: "capacityMw", label: "MW", width: "56px" },
  ],
};
