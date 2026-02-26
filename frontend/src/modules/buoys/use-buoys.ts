import { useEffect, useState } from "react";
import type { Buoy } from "@/types/buoys";

export function useBuoys() {
  const [buoys, setBuoys] = useState<Buoy[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBuoys() {
      try {
        const res = await fetch("/api/buoys", { signal: controller.signal });
        if (!res.ok) return;
        const data: Buoy[] = await res.json();
        setBuoys(data);
      } catch {
        // aborted or network error
      }
    }

    fetchBuoys();
    const interval = setInterval(fetchBuoys, 600_000); // refresh every 10 min

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return buoys;
}
