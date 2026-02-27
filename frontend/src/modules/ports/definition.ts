import { Anchor } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const PortsLayer = lazy(() => import("./ports-layer").then(m => ({ default: m.PortsLayer })));

export const portsModule: ModuleDefinition = {
  id: "ports",
  name: "Ports",
  category: "Transportation",
  icon: Anchor,
  focusZoom: FOCUS_ZOOM["ports"],
  MapLayer: PortsLayer,
  source: { name: "World Port Index", url: "https://msi.nga.mil/Publications/WPI" },
};
