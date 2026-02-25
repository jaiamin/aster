import type { StyleSpecification } from "maplibre-gl";
import { THEME } from "@/config/map";

export function transformStyle(
  style: StyleSpecification
): StyleSpecification {
  const transformed = structuredClone(style);

  // Enable globe projection
  transformed.projection = { type: "globe" };

  // Sky / atmosphere
  transformed.sky = {
    "sky-color": "#0a0a1a",
    "horizon-color": "#00d4ff08",
    "fog-color": "#0a0a0f",
    "sky-horizon-blend": 0.5,
    "horizon-fog-blend": 0.8,
    "fog-ground-blend": 0.9,
  };

  // Override background
  if (transformed.layers) {
    for (const layer of transformed.layers) {
      const paint = (layer as Record<string, unknown>).paint as
        | Record<string, unknown>
        | undefined;
      if (!paint) continue;

      const id = layer.id.toLowerCase();

      // Water
      if (id.includes("water") || id.includes("ocean")) {
        if ("fill-color" in paint) paint["fill-color"] = THEME.water;
      }

      // Land / earth / background
      if (
        layer.type === "background" ||
        id.includes("land") ||
        id.includes("earth")
      ) {
        if ("background-color" in paint)
          paint["background-color"] = THEME.background;
        if ("fill-color" in paint) paint["fill-color"] = THEME.land;
      }

      // Buildings
      if (id.includes("building")) {
        if ("fill-color" in paint) paint["fill-color"] = THEME.buildings;
        if ("fill-extrusion-color" in paint)
          paint["fill-extrusion-color"] = THEME.buildings;
      }

      // Roads
      if (
        id.includes("road") ||
        id.includes("highway") ||
        id.includes("street") ||
        id.includes("tunnel") ||
        id.includes("bridge") ||
        id.includes("path")
      ) {
        if ("line-color" in paint) paint["line-color"] = THEME.roads;
      }

      // Borders
      if (id.includes("boundary") || id.includes("border") || id.includes("admin")) {
        if ("line-color" in paint) paint["line-color"] = THEME.borders;
      }

      // Labels
      if (layer.type === "symbol") {
        if ("text-color" in paint) paint["text-color"] = THEME.labels;
        if ("text-halo-color" in paint)
          paint["text-halo-color"] = THEME.labelHalo;
        if ("text-halo-width" in paint) paint["text-halo-width"] = 1.5;
      }
    }
  }

  return transformed;
}
