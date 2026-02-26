import { CloudLightning } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { StormsLayer } from "./storms-layer";

export const stormsModule: ModuleDefinition = {
  id: "storms",
  name: "Storms",
  category: "Natural Events",
  icon: CloudLightning,
  focusZoom: FOCUS_ZOOM["storms"],
  MapLayer: StormsLayer,
};
