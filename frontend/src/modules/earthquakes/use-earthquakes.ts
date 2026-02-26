import { useEffect, useState } from "react";
import type { Earthquake } from "@/types/earthquakes";

const POLL_INTERVAL = 60_000;

export function useEarthquakes() {
  const [quakes, setQuakes] = useState<Earthquake[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchQuakes() {
      try {
        const res = await fetch("/api/earthquakes", { signal: controller.signal });
        if (!res.ok) return;
        const data: Earthquake[] = await res.json();
        setQuakes(data);
      } catch {
        // aborted or network error — ignore
      }
    }

    fetchQuakes();
    const id = setInterval(fetchQuakes, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return quakes;
}
