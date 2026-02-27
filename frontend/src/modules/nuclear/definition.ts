import { Radiation } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const NuclearLayer = lazy(() => import("./nuclear-layer").then(m => ({ default: m.NuclearLayer })));

export const nuclearModule: ModuleDefinition = {
  id: "nuclear",
  name: "Nuclear Facilities",
  category: "Infrastructure",
  icon: Radiation,
  focusZoom: FOCUS_ZOOM["nuclear"],
  MapLayer: NuclearLayer,
  source: { name: "IAEA PRIS", url: "https://pris.iaea.org" },
};
