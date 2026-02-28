import { Cable } from "lucide-react";
import { lazy } from "react";

import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { ModuleDefinition } from "@/types/modules";
const CablesLayer = lazy(() => import("./cables-layer").then((m) => ({ default: m.CablesLayer })));

export const cablesModule: ModuleDefinition = {
  id: "cables",
  name: "Submarine Cables",
  category: "Infrastructure",
  icon: Cable,
  focusZoom: FOCUS_ZOOM["cables"],
  MapLayer: CablesLayer,
  source: { name: "TeleGeography", url: "https://www.submarinecablemap.com" },
  nameKey: "name",
  listColumns: [{ key: "name", label: "Name" }],
};
