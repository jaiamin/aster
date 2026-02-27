import { Cable } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const CablesLayer = lazy(() => import("./cables-layer").then(m => ({ default: m.CablesLayer })));

export const cablesModule: ModuleDefinition = {
  id: "cables",
  name: "Submarine Cables",
  category: "Infrastructure",
  icon: Cable,
  focusZoom: FOCUS_ZOOM["cables"],
  MapLayer: CablesLayer,
  source: { name: "TeleGeography", url: "https://www.submarinecablemap.com" },
};
