import { flightsModule } from "./flights/definition";
import { satellitesModule } from "./satellites/definition";
import { shipsModule } from "./ships/definition";
import { earthquakesModule } from "./earthquakes/definition";
import { wildfiresModule } from "./wildfires/definition";
import type { ModuleDefinition } from "@/types/modules";

export const MODULE_REGISTRY: ModuleDefinition[] = [
  flightsModule,
  satellitesModule,
  shipsModule,
  earthquakesModule,
  wildfiresModule,
];

export const CATEGORY_ORDER = ["Transportation", "Space", "Natural Events"];
