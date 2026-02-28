import type { StyleSpecification, LayerSpecification } from "maplibre-gl";

import { THEME } from "@/config/map";

// English-only label expression: prefer name_en, fall back to name:latin, then name.
// Replaces the default which appends name:nonlatin on a second line.
export const ENGLISH_TEXT_FIELD = [
  "coalesce",
  ["get", "name_en"],
  ["get", "name:latin"],
  ["get", "name"],
];

// Progressive disclosure: labels and borders appear together at the right zoom.
// Layers not listed here keep their original minzoom (or none).
export const LABEL_MIN_ZOOM: Record<string, number> = {
  place_country_major: 1,
  place_country_minor: 2,
  place_country_other: 3,
  place_state: 4,
  place_city_large: 4,
  place_city: 6,
  place_town: 8,
  place_village: 10,
  place_suburb: 11,
  place_other: 12,
  water_name: 5,
};

const BOUNDARY_MIN_ZOOM: Record<string, number> = {
  boundary_state: 4, // match place_state label visibility
};

export function transformDarkStyle(style: StyleSpecification): StyleSpecification {
  const transformed = structuredClone(style);

  // Remove unused raster sources (e.g. ne2_shaded) to prevent MapLibre
  // from loading tiles for sources that have no visible layers.
  if (transformed.sources) {
    for (const [key, src] of Object.entries(transformed.sources)) {
      if ((src as Record<string, unknown>).type === "raster") {
        delete transformed.sources[key];
      }
    }
  }

  transformed.projection = { type: "globe" };
  transformed.sky = {
    "sky-color": "#0a0a1a",
    "horizon-color": "#3d7ab508",
    "fog-color": "#0a0a0f",
    "sky-horizon-blend": 0.5,
    "horizon-fog-blend": 0.8,
    "fog-ground-blend": 0.9,
  };

  if (transformed.layers) {
    for (const layer of transformed.layers) {
      const paint = (layer as Record<string, unknown>).paint as Record<string, unknown> | undefined;
      if (!paint) continue;

      const id = layer.id.toLowerCase();

      // Water — dark navy, distinct from land
      if (id.includes("water") || id.includes("ocean")) {
        if ("fill-color" in paint) paint["fill-color"] = THEME.water;
      }

      // Land / background
      if (layer.type === "background" || id.includes("land") || id.includes("earth")) {
        if ("background-color" in paint) paint["background-color"] = THEME.land;
        if ("fill-color" in paint) paint["fill-color"] = THEME.land;
      }

      // Buildings
      if (id.includes("building")) {
        if ("fill-color" in paint) paint["fill-color"] = THEME.buildings;
        if ("fill-extrusion-color" in paint) paint["fill-extrusion-color"] = THEME.buildings;
      }

      // Major roads — brighter
      if (
        id.includes("highway") ||
        id.includes("motorway") ||
        id.includes("trunk") ||
        id.includes("primary")
      ) {
        if ("line-color" in paint) paint["line-color"] = THEME.roadsMajor;
      }
      // Minor roads
      else if (
        id.includes("road") ||
        id.includes("street") ||
        id.includes("secondary") ||
        id.includes("tertiary") ||
        id.includes("tunnel") ||
        id.includes("bridge") ||
        id.includes("path")
      ) {
        if ("line-color" in paint) paint["line-color"] = THEME.roads;
      }

      // Borders — visible blue, zoom-gated for sub-country boundaries
      if (id.includes("boundary") || id.includes("border") || id.includes("admin")) {
        if ("line-color" in paint) paint["line-color"] = THEME.borders;

        const minZoom = BOUNDARY_MIN_ZOOM[layer.id];
        if (minZoom !== undefined) {
          (layer as LayerSpecification & { minzoom?: number }).minzoom = minZoom;
        }
      }

      // Labels — English only, bright with solid halos, zoom-gated visibility
      if (layer.type === "symbol") {
        if ("text-color" in paint) paint["text-color"] = THEME.labels;
        if ("text-halo-color" in paint) paint["text-halo-color"] = THEME.labelHalo;
        paint["text-halo-width"] = 2;

        const layout = ((layer as Record<string, unknown>).layout ?? {}) as Record<string, unknown>;
        if (
          layout["text-field"] &&
          !layer.id.startsWith("road_") &&
          !layer.id.startsWith("highway_name_motorway")
        ) {
          layout["text-field"] = ENGLISH_TEXT_FIELD;
          (layer as Record<string, unknown>).layout = layout;
        }

        const minZoom = LABEL_MIN_ZOOM[layer.id];
        if (minZoom !== undefined) {
          (layer as LayerSpecification & { minzoom?: number }).minzoom = minZoom;
        }
      }
    }
  }

  return transformed;
}
