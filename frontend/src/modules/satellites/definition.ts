import { Satellite } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { SatellitesLayer } from "./satellites-layer";

export const satellitesModule: ModuleDefinition = {
  id: "satellites",
  name: "Satellites",
  category: "Space",
  icon: Satellite,
  focusZoom: FOCUS_ZOOM["satellites"],
  MapLayer: SatellitesLayer,
};
