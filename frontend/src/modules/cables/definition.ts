import { Cable } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { CablesLayer } from "./cables-layer";

export const cablesModule: ModuleDefinition = {
  id: "cables",
  name: "Submarine Cables",
  category: "Infrastructure",
  icon: Cable,
  focusZoom: FOCUS_ZOOM["cables"],
  MapLayer: CablesLayer,
};
