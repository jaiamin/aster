import { Flame } from "lucide-react";
import { lazy } from "react";

import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { ModuleDefinition } from "@/types/modules";
const WildfiresLayer = lazy(() =>
  import("./wildfires-layer").then((m) => ({ default: m.WildfiresLayer })),
);

export const wildfiresModule: ModuleDefinition = {
  id: "wildfires",
  name: "Wildfires",
  category: "Events",
  icon: Flame,
  focusZoom: FOCUS_ZOOM["wildfires"],
  MapLayer: WildfiresLayer,
  source: { name: "NASA FIRMS", url: "https://firms.modaps.eosdis.nasa.gov" },
  nameKey: "country",
  filters: [
    { key: "confidence", label: "Confidence", type: "enum" },
    { key: "frp", label: "FRP", type: "range", min: 0, max: 1000, unit: "MW" },
    { key: "daynight", label: "Day/Night", type: "enum", options: ["D", "N"] },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "country", label: "Country" },
    { key: "frp", label: "FRP (MW)", width: "72px", align: "right" },
    { key: "confidence", label: "Conf", width: "56px" },
  ],
};
