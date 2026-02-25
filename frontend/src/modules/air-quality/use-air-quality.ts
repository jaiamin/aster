import { useEffect, useState } from "react";
import type { AirQualityStation } from "@/types/air-quality";

const POLL_INTERVAL = 300_000; // 5 minutes
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

export function useAirQuality() {
  const [stations, setStations] = useState<AirQualityStation[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStations() {
      try {
        const res = await fetch("/api/air-quality", { signal: controller.signal });
        if (!res.ok) return;
        const data: AirQualityStation[] = await res.json();
        const cutoff = Date.now() - MAX_AGE_MS;
        setStations(data.filter((s) => !s.lastUpdated || new Date(s.lastUpdated).getTime() >= cutoff));
      } catch {
        // aborted or network error
      }
    }

    fetchStations();
    const id = setInterval(fetchStations, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return stations;
}
