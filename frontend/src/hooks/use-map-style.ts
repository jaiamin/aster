import { useEffect, useState, useMemo } from "react";
import type { StyleSpecification, LayerSpecification } from "maplibre-gl";
import { MAP_STYLE_DARK } from "@/config/map";
import type { MapStyleMode } from "@/config/map";
import { transformDarkStyle } from "@/styles/dark-globe-style";

const SATELLITE_SOURCE = {
  type: "raster" as const,
  tiles: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ],
  tileSize: 256,
  maxzoom: 19,
};

function buildSatelliteStyle(
  base: StyleSpecification
): StyleSpecification {
  const style = structuredClone(base);

  style.projection = { type: "globe" };
  style.sources = { ...style.sources, satellite: SATELLITE_SOURCE };

  const symbolLayers = (style.layers ?? []).filter(
    (l: LayerSpecification) => l.type === "symbol"
  );

  for (const layer of symbolLayers) {
    const paint = ((layer as Record<string, unknown>).paint ?? {}) as Record<
      string,
      unknown
    >;
    paint["text-color"] = "#ffffff";
    paint["text-halo-color"] = "#000000";
    paint["text-halo-width"] = 1.5;
    (layer as Record<string, unknown>).paint = paint;
  }

  style.layers = [
    { id: "satellite-base", type: "raster", source: "satellite" } as LayerSpecification,
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
    return mode === "dark"
      ? transformDarkStyle(baseStyle)
      : buildSatelliteStyle(baseStyle);
  }, [baseStyle, mode]);
}
