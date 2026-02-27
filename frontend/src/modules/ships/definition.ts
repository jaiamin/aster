import { Ship } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { SHIP_TYPE_LABELS, NAV_STATUS_LABELS } from "./ship-labels";
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
  nameKey: "name",
  filters: [
    { key: "shipType", label: "Ship Type", type: "enum", labelMap: SHIP_TYPE_LABELS },
    { key: "speed", label: "Speed", type: "range", min: 0, max: 30, unit: "kts" },
    { key: "navStatus", label: "Status", type: "enum", labelMap: NAV_STATUS_LABELS },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "shipType", label: "Type", width: "64px", labelMap: SHIP_TYPE_LABELS },
    { key: "speed", label: "Speed", width: "56px", align: "right" },
  ],
};
