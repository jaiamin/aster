import { Plane } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FlightsLayer } from "./flights-layer";

export const flightsModule: ModuleDefinition = {
  id: "flights",
  name: "Flights",
  icon: Plane,
  MapLayer: FlightsLayer,
};
