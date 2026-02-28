type Bbox = [number, number, number, number]; // [west, south, east, north]

export function oceanName(lat: number, lng: number): string {
  if (lat > 66.5) return "Arctic Ocean";
  if (lat < -60) return "Southern Ocean";

  const lon = (((lng % 360) + 540) % 360) - 180;

  // Indian Ocean: ~20°E to ~120°E, south of ~30°N
  if (lon >= 20 && lon <= 120 && lat <= 30) return "Indian Ocean";

  // Atlantic Ocean: ~80°W to ~20°E
  if (lon >= -80 && lon <= 20) {
    return lat >= 0 ? "North Atlantic" : "South Atlantic";
  }

  // Pacific Ocean: everything else
  return lat >= 0 ? "North Pacific" : "South Pacific";
}

interface ReverseAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

export function extractLocation(
  addr: ReverseAddress | undefined,
  lat: number,
  lng: number,
): string {
  if (!addr) return oceanName(lat, lng);

  const city =
    addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.municipality ?? addr.county;
  const code = addr.country_code?.toUpperCase();

  if (city && code) return `${city}, ${code}`;
  if (city && addr.country) return `${city}, ${addr.country}`;
  if (addr.state && code) return `${addr.state}, ${code}`;
  if (addr.country) return addr.country;

  return oceanName(lat, lng);
}

export function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export function computeBbox(geometry: GeoJSON.Geometry): Bbox {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;
  const visit = (coords: unknown) => {
    if (typeof (coords as number[])[0] === "number") {
      const [lng, lat] = coords as number[];
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      return;
    }
    for (const c of coords as unknown[]) visit(c);
  };
  if ("coordinates" in geometry) visit((geometry as { coordinates: unknown }).coordinates);
  return [west, south, east, north];
}
