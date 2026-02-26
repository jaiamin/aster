import { useEffect, useState } from "react";
import type { NuclearFacility } from "@/types/nuclear";

const POLL_INTERVAL = 3_600_000; // 1 hour — static data

export function useNuclear() {
  const [facilities, setFacilities] = useState<NuclearFacility[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchFacilities() {
      try {
        const res = await fetch("/api/nuclear", { signal: controller.signal });
        if (!res.ok) return;
        const data: NuclearFacility[] = await res.json();
        setFacilities(data);
      } catch {
        // aborted or network error
      }
    }

    fetchFacilities();
    const id = setInterval(fetchFacilities, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return facilities;
}
