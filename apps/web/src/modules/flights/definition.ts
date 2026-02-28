import { Plane } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const FlightsLayer = lazy(() =>
  import("./flights-layer").then((m) => ({ default: m.FlightsLayer })),
);

export const flightsModule: ModuleDefinition = {
  id: "flights",
  name: "Flights",
  category: "Tracking",
  icon: Plane,
  focusZoom: FOCUS_ZOOM["flights"],
  MapLayer: FlightsLayer,
  source: { name: "OpenSky Network", url: "https://opensky-network.org" },
  nameKey: "callsign",
  filters: [
    { key: "origin_country", label: "Country", type: "enum" },
    { key: "baro_altitude", label: "Altitude", type: "range", min: 0, max: 50000, unit: "ft" },
    { key: "velocity", label: "Speed", type: "range", min: 0, max: 600, unit: "kts" },
  ],
  listColumns: [
    { key: "callsign", label: "Callsign" },
    { key: "origin_country", label: "Country" },
    { key: "baro_altitude", label: "Alt (ft)", width: "72px", align: "right" },
  ],
};
