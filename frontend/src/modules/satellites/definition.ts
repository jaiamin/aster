import { Satellite } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { SatellitesLayer } from "./satellites-layer";

export const satellitesModule: ModuleDefinition = {
  id: "satellites",
  name: "Satellites",
  icon: Satellite,
  MapLayer: SatellitesLayer,
};
