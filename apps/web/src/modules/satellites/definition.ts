import { Satellite } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { lazy } from "react";
const SatellitesLayer = lazy(() =>
  import("./satellites-layer").then((m) => ({ default: m.SatellitesLayer })),
);

export const satellitesModule: ModuleDefinition = {
  id: "satellites",
  name: "Satellites",
  category: "Tracking",
  icon: Satellite,
  focusZoom: FOCUS_ZOOM["satellites"],
  MapLayer: SatellitesLayer,
  source: { name: "CelesTrak", url: "https://celestrak.org" },
  nameKey: "name",
  filters: [
    { key: "OBJECT_TYPE", label: "Type", type: "enum" },
    { key: "owner", label: "Owner", type: "enum" },
  ],
  listColumns: [
    { key: "name", label: "Name" },
    { key: "owner", label: "Owner" },
    { key: "OBJECT_TYPE", label: "Type", width: "72px" },
  ],
};
