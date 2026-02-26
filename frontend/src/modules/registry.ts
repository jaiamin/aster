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
import { launchesModule } from "./launches/definition";
import type { ModuleDefinition } from "@/types/modules";

export const MODULE_REGISTRY: ModuleDefinition[] = [
  cablesModule,
  buoysModule,
  nuclearModule,
  airQualityModule,
  volcanoesModule,
  wildfiresModule,
  earthquakesModule,
  portsModule,
  airportsModule,
  shipsModule,
  satellitesModule,
  launchesModule,
  flightsModule,
];

export const CATEGORY_ORDER = ["Transportation", "Space", "Natural Events", "Environment", "Infrastructure"];
