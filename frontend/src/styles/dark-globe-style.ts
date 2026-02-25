import type { StyleSpecification } from "maplibre-gl";
import { THEME } from "@/config/map";

export function transformDarkStyle(
  style: StyleSpecification
): StyleSpecification {
  const transformed = structuredClone(style);

  transformed.projection = { type: "globe" };
  transformed.sky = {
    "sky-color": "#0a0a1a",
    "horizon-color": "#1e88a808",
    "fog-color": "#0a0a0f",
    "sky-horizon-blend": 0.5,
    "horizon-fog-blend": 0.8,
    "fog-ground-blend": 0.9,
  };

  if (transformed.layers) {
    for (const layer of transformed.layers) {
      const paint = (layer as Record<string, unknown>).paint as
        | Record<string, unknown>
        | undefined;
      if (!paint) continue;

      const id = layer.id.toLowerCase();

      // Water — dark navy, distinct from land
      if (id.includes("water") || id.includes("ocean")) {
        if ("fill-color" in paint) paint["fill-color"] = THEME.water;
      }

      // Land / background
      if (
        layer.type === "background" ||
        id.includes("land") ||
        id.includes("earth")
      ) {
        if ("background-color" in paint)
          paint["background-color"] = THEME.land;
        if ("fill-color" in paint) paint["fill-color"] = THEME.land;
      }

      // Buildings
      if (id.includes("building")) {
        if ("fill-color" in paint) paint["fill-color"] = THEME.buildings;
        if ("fill-extrusion-color" in paint)
          paint["fill-extrusion-color"] = THEME.buildings;
      }

      // Major roads — brighter
      if (id.includes("highway") || id.includes("motorway") || id.includes("trunk") || id.includes("primary")) {
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

      // Borders — visible blue
      if (
        id.includes("boundary") ||
        id.includes("border") ||
        id.includes("admin")
      ) {
        if ("line-color" in paint) paint["line-color"] = THEME.borders;
      }

      // Labels — bright with solid halos
      if (layer.type === "symbol") {
        if ("text-color" in paint) paint["text-color"] = THEME.labels;
        if ("text-halo-color" in paint)
          paint["text-halo-color"] = THEME.labelHalo;
        paint["text-halo-width"] = 2;
      }
    }
  }

  return transformed;
}
