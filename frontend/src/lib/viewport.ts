import type maplibregl from "maplibre-gl";

export function filterByBounds<T>(
  items: T[],
  getCoords: (item: T) => [lng: number, lat: number],
  map: maplibregl.Map,
): T[] {
  const bounds = map.getBounds();
  const pad = Math.max(
    (bounds.getEast() - bounds.getWest()) * 0.1,
    (bounds.getNorth() - bounds.getSouth()) * 0.1,
  );
  const west = bounds.getWest() - pad;
  const east = bounds.getEast() + pad;
  const south = bounds.getSouth() - pad;
  const north = bounds.getNorth() + pad;
  const wraps = west > east;

  return items.filter((item) => {
    const [lng, lat] = getCoords(item);
    const lngOk = wraps ? lng >= west || lng <= east : lng >= west && lng <= east;
    return lngOk && lat >= south && lat <= north;
  });
}
