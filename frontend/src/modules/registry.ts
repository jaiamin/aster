import { flightsModule } from "./flights/definition";
import { satellitesModule } from "./satellites/definition";
import { shipsModule } from "./ships/definition";
import { earthquakesModule } from "./earthquakes/definition";
import { wildfiresModule } from "./wildfires/definition";
import { volcanoesModule } from "./volcanoes/definition";
import { airQualityModule } from "./air-quality/definition";
import { buoysModule } from "./buoys/definition";
import { nuclearModule } from "./nuclear/definition";
import { cablesModule } from "./cables/definition";
import { airportsModule } from "./airports/definition";
import { portsModule } from "./ports/definition";
import type { ModuleDefinition } from "@/types/modules";

export const MODULE_REGISTRY: ModuleDefinition[] = [
  flightsModule,
  satellitesModule,
  shipsModule,
  airportsModule,
  portsModule,
  earthquakesModule,
  wildfiresModule,
  volcanoesModule,
  airQualityModule,
  buoysModule,
  nuclearModule,
  cablesModule,
];

export const CATEGORY_ORDER = ["Transportation", "Space", "Natural Events", "Environment", "Infrastructure"];
