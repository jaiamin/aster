import { Wind } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { AirQualityLayer } from "./air-quality-layer";

export const airQualityModule: ModuleDefinition = {
  id: "air-quality",
  name: "Air Quality",
  category: "Environment",
  icon: Wind,
  focusZoom: FOCUS_ZOOM["air-quality"],
  MapLayer: AirQualityLayer,
};
