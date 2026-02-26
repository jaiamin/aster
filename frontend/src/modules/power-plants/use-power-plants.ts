import { useEffect, useState } from "react";
import type { PowerPlant } from "@/types/power-plants";

const POLL_INTERVAL = 3_600_000; // 1 hour — static data

export function usePowerPlants() {
  const [plants, setPlants] = useState<PowerPlant[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPlants() {
      try {
        const res = await fetch("/api/power-plants", { signal: controller.signal });
        if (!res.ok) return;
        const data: PowerPlant[] = await res.json();
        setPlants(data);
      } catch {
        // aborted or network error
      }
    }

    fetchPlants();
    const id = setInterval(fetchPlants, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return plants;
}
