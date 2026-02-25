import { flightsModule } from "./flights/definition";
import { satellitesModule } from "./satellites/definition";
import { shipsModule } from "./ships/definition";
import { earthquakesModule } from "./earthquakes/definition";
import { wildfiresModule } from "./wildfires/definition";
import { volcanoesModule } from "./volcanoes/definition";
import { airQualityModule } from "./air-quality/definition";
import { nuclearModule } from "./nuclear/definition";
import type { ModuleDefinition } from "@/types/modules";

export const MODULE_REGISTRY: ModuleDefinition[] = [
  flightsModule,
  satellitesModule,
  shipsModule,
  earthquakesModule,
  wildfiresModule,
  volcanoesModule,
  airQualityModule,
  nuclearModule,
];

export const CATEGORY_ORDER = ["Transportation", "Space", "Natural Events", "Environment", "Infrastructure"];
