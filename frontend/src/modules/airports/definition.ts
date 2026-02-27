import { PlaneTakeoff } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const AirportsLayer = lazy(() => import("./airports-layer").then(m => ({ default: m.AirportsLayer })));

export const airportsModule: ModuleDefinition = {
  id: "airports",
  name: "Airports",
  category: "Infrastructure",
  icon: PlaneTakeoff,
  focusZoom: FOCUS_ZOOM["airports"],
  MapLayer: AirportsLayer,
  source: { name: "OurAirports", url: "https://ourairports.com" },
  filters: [
    { key: "type", label: "Type", type: "enum" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "iata", label: "IATA", width: "48px" },
    { key: "country", label: "Country", width: "56px" },
  ],
};
