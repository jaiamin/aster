import { useEffect, useState } from "react";

import type { GPRecord } from "@/types/satellites";

const REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

export function useSatellites() {
  const [records, setRecords] = useState<GPRecord[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSatellites() {
      try {
        const res = await fetch("/api/satellites", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: GPRecord[] = await res.json();
        setRecords(data);
      } catch {
        // aborted or network error — ignore
      }
    }

    fetchSatellites();
    const id = setInterval(fetchSatellites, REFRESH_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return records;
}
