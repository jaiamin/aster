import { Ship } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ShipsLayer } from "./ships-layer";

export const shipsModule: ModuleDefinition = {
  id: "ships",
  name: "Vessels",
  category: "Transportation",
  icon: Ship,
  focusZoom: FOCUS_ZOOM["ships"],
  MapLayer: ShipsLayer,
};
