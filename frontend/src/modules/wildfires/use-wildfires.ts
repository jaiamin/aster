import { useEffect, useState } from "react";
import type { Wildfire } from "@/types/wildfires";

const POLL_INTERVAL = 300_000; // 5 minutes

export function useWildfires() {
  const [fires, setFires] = useState<Wildfire[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchFires() {
      try {
        const res = await fetch("/api/wildfires", { signal: controller.signal });
        if (!res.ok) return;
        const data: Wildfire[] = await res.json();
        setFires(data);
      } catch {
        // aborted or network error — ignore
      }
    }

    fetchFires();
    const id = setInterval(fetchFires, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return fires;
}
