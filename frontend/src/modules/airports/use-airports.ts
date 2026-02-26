import { useEffect, useState } from "react";
import type { Airport } from "@/types/airports";

export function useAirports() {
  const [airports, setAirports] = useState<Airport[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAirports() {
      try {
        const res = await fetch("/api/airports", { signal: controller.signal });
        if (!res.ok) return;
        const data: Airport[] = await res.json();
        setAirports(data);
      } catch {
        // aborted or network error
      }
    }

    fetchAirports();

    return () => {
      controller.abort();
    };
  }, []);

  return airports;
}
