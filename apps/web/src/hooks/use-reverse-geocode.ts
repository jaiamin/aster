import { useEffect, useState } from "react";

import { cacheKey, extractLocation, oceanName } from "@/lib/geo";

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
