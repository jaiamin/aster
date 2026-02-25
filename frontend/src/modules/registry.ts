import { flightsModule } from "./flights/definition";
import { satellitesModule } from "./satellites/definition";
import { shipsModule } from "./ships/definition";
import { earthquakesModule } from "./earthquakes/definition";
import type { ModuleDefinition } from "@/types/modules";

export const MODULE_REGISTRY: ModuleDefinition[] = [
  flightsModule,
  satellitesModule,
  shipsModule,
  earthquakesModule,
];
