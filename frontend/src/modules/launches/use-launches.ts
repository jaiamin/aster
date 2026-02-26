import { useEffect, useState } from "react";
import type { Launch } from "@/types/launches";

const POLL_INTERVAL = 600_000; // 10 min

export function useLaunches() {
  const [launches, setLaunches] = useState<Launch[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLaunches() {
      try {
        const res = await fetch("/api/launches", { signal: controller.signal });
        if (!res.ok) return;
        const data: Launch[] = await res.json();
        setLaunches(data);
      } catch {
        // aborted or network error
      }
    }

    fetchLaunches();
    const id = setInterval(fetchLaunches, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return launches;
}
