import { useEffect, useState } from "react";
import type { Flight } from "@/types/flights";

const POLL_INTERVAL = 10_000;

export function useFlights() {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchFlights() {
      try {
        const res = await fetch("/api/flights", { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setFlights(data.flights);
      } catch {
        // aborted or network error — ignore
      }
    }

    fetchFlights();
    const id = setInterval(fetchFlights, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return flights;
}
