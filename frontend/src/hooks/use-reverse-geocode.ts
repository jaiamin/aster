import { useEffect, useState } from "react";

interface ReverseResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

const cache = new Map<string, string>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function oceanName(lat: number, lng: number): string {
  if (lat > 66.5) return "Arctic Ocean";
  if (lat < -60) return "Southern Ocean";

  const lon = ((lng % 360) + 540) % 360 - 180;

  // Indian Ocean: ~20°E to ~120°E, south of ~30°N
  if (lon >= 20 && lon <= 120 && lat <= 30) return "Indian Ocean";

  // Atlantic Ocean: ~80°W to ~20°E
  if (lon >= -80 && lon <= 20) {
    return lat >= 0 ? "North Atlantic" : "South Atlantic";
  }

  // Pacific Ocean: everything else
  return lat >= 0 ? "North Pacific" : "South Pacific";
}

function extractLocation(addr: ReverseResult["address"], lat: number, lng: number): string {
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

export function useReverseGeocode(latitude: number, longitude: number): string | undefined {
  const key = cacheKey(latitude, longitude);
  const [location, setLocation] = useState<string | undefined>(() => cache.get(key));

  useEffect(() => {
    const cached = cache.get(key);
    if (cached) {
      setLocation(cached);
      return;
    }

    const controller = new AbortController();

    fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: String(latitude),
          lon: String(longitude),
          format: "json",
          zoom: "14",
          addressdetails: "1",
        }),
      { signal: controller.signal, headers: { "Accept-Language": "en" } },
    )
      .then((r) => r.json())
      .then((data: ReverseResult) => {
        const loc = extractLocation(data.address, latitude, longitude);
        cache.set(key, loc);
        setLocation(loc);
      })
      .catch(() => {
        const fallback = oceanName(latitude, longitude);
        cache.set(key, fallback);
        setLocation(fallback);
      });

    return () => controller.abort();
  }, [key, latitude, longitude]);

  return location;
}
