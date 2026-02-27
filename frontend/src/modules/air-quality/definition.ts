import { Wind } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const AirQualityLayer = lazy(() => import("./air-quality-layer").then(m => ({ default: m.AirQualityLayer })));

export const airQualityModule: ModuleDefinition = {
  id: "air-quality",
  name: "Air Quality",
  category: "Environment",
  icon: Wind,
  focusZoom: FOCUS_ZOOM["air-quality"],
  MapLayer: AirQualityLayer,
  source: { name: "OpenAQ", url: "https://openaq.org" },
};
