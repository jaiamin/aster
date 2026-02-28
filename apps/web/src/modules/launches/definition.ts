import { Rocket } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const LaunchesLayer = lazy(() =>
  import("./launches-layer").then((m) => ({ default: m.LaunchesLayer })),
);

export const launchesModule: ModuleDefinition = {
  id: "launches",
  name: "Rocket Launches",
  category: "Events",
  icon: Rocket,
  focusZoom: FOCUS_ZOOM["launches"],
  MapLayer: LaunchesLayer,
  source: { name: "Launch Library", url: "https://thespacedevs.com" },
  nameKey: "name",
  filters: [
    { key: "status", label: "Status", type: "enum" },
    { key: "provider", label: "Provider", type: "enum" },
    { key: "missionOrbit", label: "Orbit", type: "enum" },
    { key: "country", label: "Country", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "status", label: "Status", width: "56px" },
    { key: "provider", label: "Provider", width: "80px" },
  ],
};
