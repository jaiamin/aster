import { Mountain } from "lucide-react";
import { lazy } from "react";

import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { ModuleDefinition } from "@/types/modules";
const VolcanoesLayer = lazy(() =>
  import("./volcanoes-layer").then((m) => ({ default: m.VolcanoesLayer })),
);

export const volcanoesModule: ModuleDefinition = {
  id: "volcanoes",
  name: "Volcanoes",
  category: "Events",
  icon: Mountain,
  focusZoom: FOCUS_ZOOM["volcanoes"],
  MapLayer: VolcanoesLayer,
  source: { name: "NASA EONET", url: "https://eonet.gsfc.nasa.gov" },
  nameKey: "title",
  filters: [{ key: "country", label: "Country", type: "enum" }],
  listColumns: [
    { key: "title", label: "Name" },
    { key: "country", label: "Country" },
  ],
};
