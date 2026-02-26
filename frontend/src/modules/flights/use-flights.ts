import { useEffect, useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import type { Flight } from "@/types/flights";

const POLL_INTERVAL = 30_000;

export function useFlights() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const visible = usePageVisibility();

  useEffect(() => {
    if (!visible) return;
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
  }, [visible]);

  return flights;
}
