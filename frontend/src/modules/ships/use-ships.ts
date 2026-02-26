import { useEffect, useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import type { Ship } from "@/types/ships";

const POLL_INTERVAL = 30_000;

export function useShips() {
  const [ships, setShips] = useState<Ship[] | null>(null);
  const visible = usePageVisibility();

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();

    async function fetchShips() {
      try {
        const res = await fetch("/api/ships", { signal: controller.signal });
        if (!res.ok) return;
        const data: Ship[] = await res.json();
        setShips(data);
      } catch {
        // aborted or network error — ignore
      }
    }

    fetchShips();
    const id = setInterval(fetchShips, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [visible]);

  return ships;
}
