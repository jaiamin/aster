/** Focus zoom levels per module, used by layers and detail cards.
 *  Edit values here — definitions and layers both read from this map. */
export const FOCUS_ZOOM: Record<string, number> = {
  flights: 10,
  satellites: 4, // NOT USED (dynamic)
  ships: 15,
  airports: 14,
  ports: 15,
  earthquakes: 14,
  wildfires: 14,
  volcanoes: 14,
  "air-quality": 14,
  buoys: 12,
  nuclear: 14,
  cables: 4, // NOT USED
  launches: 10,
  storms: 6,
};
