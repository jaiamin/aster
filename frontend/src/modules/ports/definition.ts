import { Anchor } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { PortsLayer } from "./ports-layer";

export const portsModule: ModuleDefinition = {
  id: "ports",
  name: "Ports",
  category: "Transportation",
  icon: Anchor,
  focusZoom: FOCUS_ZOOM["ports"],
  MapLayer: PortsLayer,
};
