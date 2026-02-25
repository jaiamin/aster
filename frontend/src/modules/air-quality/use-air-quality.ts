import { useEffect, useState } from "react";
import type { AirQualityStation } from "@/types/air-quality";

const POLL_INTERVAL = 300_000; // 5 minutes

export function useAirQuality() {
  const [stations, setStations] = useState<AirQualityStation[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStations() {
      try {
        const res = await fetch("/api/air-quality", { signal: controller.signal });
        if (!res.ok) return;
        const data: AirQualityStation[] = await res.json();
        setStations(data);
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
