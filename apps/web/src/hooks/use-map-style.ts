import type { StyleSpecification, LayerSpecification } from "maplibre-gl";
import { useEffect, useState, useMemo } from "react";

import { MAP_STYLE_DARK } from "@/config/map";
import type { MapStyleMode } from "@/config/map";
import { transformDarkStyle, LABEL_MIN_ZOOM, ENGLISH_TEXT_FIELD } from "@/styles/dark-globe-style";

const SATELLITE_SOURCE = {
  type: "raster" as const,
  tiles: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ],
  tileSize: 256,
  maxzoom: 19,
};

function isBoundaryLayer(layer: LayerSpecification) {
  return (
    layer.type === "line" &&
    (layer.id.startsWith("boundary_country") || layer.id === "boundary_state")
  );
}

const SATELLITE_BOUNDARY_STYLE: Record<string, { color: string; width: number; minzoom?: number }> =
  {
    boundary_state: { color: "rgba(255, 255, 255, 0.4)", width: 1, minzoom: 4 },
  };

function buildSatelliteStyle(base: StyleSpecification): StyleSpecification {
  const style = structuredClone(base);

  style.projection = { type: "globe" };
  style.sources = { ...style.sources, satellite: SATELLITE_SOURCE };

  const allLayers = style.layers ?? [];

  // Keep boundary lines — country always visible, state from zoom 4
  const boundaryLayers = allLayers.filter(isBoundaryLayer).map((layer) => {
    const l = layer as LayerSpecification & Record<string, unknown>;
    const override = SATELLITE_BOUNDARY_STYLE[layer.id];
    l.paint = {
      ...((l.paint as Record<string, unknown>) ?? {}),
      "line-color": override?.color ?? "rgba(255, 255, 255, 0.7)",
      "line-width": override?.width ?? 1.5,
    };
    if (override?.minzoom !== undefined) {
      (l as LayerSpecification & { minzoom?: number }).minzoom = override.minzoom;
    }
    return l;
  });

  // Keep symbol layers — restyle + zoom-gate for satellite
  const symbolLayers = allLayers.filter((l: LayerSpecification) => l.type === "symbol");

  for (const layer of symbolLayers) {
    const paint = ((layer as Record<string, unknown>).paint ?? {}) as Record<string, unknown>;
    paint["text-color"] = "#ffffff";
    paint["text-halo-color"] = "#000000";
    paint["text-halo-width"] = 1.5;
    (layer as Record<string, unknown>).paint = paint;

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

  style.layers = [
    { id: "satellite-base", type: "raster", source: "satellite" } as LayerSpecification,
    ...boundaryLayers,
    ...symbolLayers,
  ];

  return style;
}

export function useMapStyle(mode: MapStyleMode) {
  const [baseStyle, setBaseStyle] = useState<StyleSpecification | null>(null);

  useEffect(() => {
    fetch(MAP_STYLE_DARK)
      .then((r) => r.json())
      .then(setBaseStyle);
  }, []);

  return useMemo(() => {
    if (!baseStyle) return null;
    return mode === "dark" ? transformDarkStyle(baseStyle) : buildSatelliteStyle(baseStyle);
  }, [baseStyle, mode]);
}
