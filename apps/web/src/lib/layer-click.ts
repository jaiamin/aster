/**
 * Centralized click priority for map layers.
 *
 * Modules register their interactive layer IDs. On click, we query all
 * registered layers in a single `queryRenderedFeatures` call — MapLibre
 * returns features ordered by visual z-order (topmost first). The first
 * match wins and other modules' handlers see `_layerHandled = true`.
 *
 * This guarantees that visually-on-top layers (e.g. flights above ships)
 * always win click priority regardless of handler registration order.
 */

type ClickHandler = (feature: maplibregl.GeoJSONFeature, e: maplibregl.MapMouseEvent) => void;

interface Registration {
  layerId: string;
  handler: ClickHandler;
}

const registrations = new Map<string, Registration>();

/** Register a module's interactive layer. Call in useEffect, return the cleanup. */
export function registerLayerClick(layerId: string, handler: ClickHandler): () => void {
  registrations.set(layerId, { layerId, handler });
  return () => {
    registrations.delete(layerId);
  };
}

/** Attach to the map once. Returns cleanup function. */
export function attachClickDispatcher(map: maplibregl.Map): () => void {
  const handleClick = (e: maplibregl.MapMouseEvent) => {
    if ((e.originalEvent as MouseEvent & { _layerHandled?: boolean })._layerHandled) return;

    const layerIds = Array.from(registrations.keys()).filter((id) => {
      try {
        return !!map.getLayer(id);
      } catch {
        return false;
      }
    });
    if (layerIds.length === 0) return;

    // queryRenderedFeatures returns features ordered by visual z-order (topmost first)
    const features = map.queryRenderedFeatures(e.point, { layers: layerIds });
    if (features.length === 0) return;

    const topFeature = features[0];
    const winnerLayer = topFeature.layer?.id;
    if (!winnerLayer) return;

    const reg = registrations.get(winnerLayer);
    if (reg) {
      (e.originalEvent as MouseEvent & { _layerHandled?: boolean })._layerHandled = true;
      reg.handler(topFeature, e);
    }
  };

  map.on("click", handleClick);
  return () => {
    map.off("click", handleClick);
  };
}
