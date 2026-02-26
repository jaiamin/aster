import { Mountain } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const VolcanoesLayer = lazy(() => import("./volcanoes-layer").then(m => ({ default: m.VolcanoesLayer })));

export const volcanoesModule: ModuleDefinition = {
  id: "volcanoes",
  name: "Volcanoes",
  category: "Natural Events",
  icon: Mountain,
  focusZoom: FOCUS_ZOOM["volcanoes"],
  MapLayer: VolcanoesLayer,
};
