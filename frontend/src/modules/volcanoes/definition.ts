import { Mountain } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { VolcanoesLayer } from "./volcanoes-layer";

export const volcanoesModule: ModuleDefinition = {
  id: "volcanoes",
  name: "Volcanoes",
  category: "Natural Events",
  icon: Mountain,
  focusZoom: FOCUS_ZOOM["volcanoes"],
  MapLayer: VolcanoesLayer,
};
