import { Activity } from "lucide-react";
import { lazy } from "react";

import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { ModuleDefinition } from "@/types/modules";
const EarthquakesLayer = lazy(() =>
  import("./earthquakes-layer").then((m) => ({ default: m.EarthquakesLayer })),
);

export const earthquakesModule: ModuleDefinition = {
  id: "earthquakes",
  name: "Earthquakes",
  category: "Events",
  icon: Activity,
  focusZoom: FOCUS_ZOOM["earthquakes"],
  MapLayer: EarthquakesLayer,
  source: { name: "USGS", url: "https://earthquake.usgs.gov" },
  nameKey: "place",
  filters: [
    { key: "magnitude", label: "Magnitude", type: "range", min: 0, max: 10 },
    { key: "depth", label: "Depth", type: "range", min: 0, max: 700, unit: "km" },
    { key: "tsunami", label: "Tsunami", type: "boolean" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "place", label: "Location" },
    { key: "magnitude", label: "Mag", width: "48px", align: "right" },
    { key: "depth", label: "Depth", width: "64px", align: "right" },
  ],
};
