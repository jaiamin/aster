import { Wind } from "lucide-react";
import { lazy } from "react";

import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { ModuleDefinition } from "@/types/modules";
const AirQualityLayer = lazy(() =>
  import("./air-quality-layer").then((m) => ({ default: m.AirQualityLayer })),
);

export const airQualityModule: ModuleDefinition = {
  id: "air-quality",
  name: "Air Quality",
  category: "Environment",
  icon: Wind,
  focusZoom: FOCUS_ZOOM["air-quality"],
  MapLayer: AirQualityLayer,
  source: { name: "OpenAQ", url: "https://openaq.org" },
  nameKey: "name",
  filters: [
    { key: "pm25", label: "PM2.5", type: "range", min: 0, max: 500 },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Station" },
    { key: "pm25", label: "PM2.5", width: "56px", align: "right" },
    { key: "country", label: "Country", width: "64px" },
  ],
};
