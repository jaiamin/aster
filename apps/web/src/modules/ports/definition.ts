import { Anchor } from "lucide-react";
import { lazy } from "react";

import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { ModuleDefinition } from "@/types/modules";
const PortsLayer = lazy(() => import("./ports-layer").then((m) => ({ default: m.PortsLayer })));

export const portsModule: ModuleDefinition = {
  id: "ports",
  name: "Ports",
  category: "Infrastructure",
  icon: Anchor,
  focusZoom: FOCUS_ZOOM["ports"],
  MapLayer: PortsLayer,
  source: { name: "World Port Index", url: "https://msi.nga.mil/Publications/WPI" },
  nameKey: "name",
  filters: [{ key: "country", label: "Country", type: "enum" }],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "country", label: "Country" },
  ],
};
