import { useEffect, useState } from "react";
import type { Storm } from "@/types/storms";

const POLL_INTERVAL = 300_000;

export function useStorms() {
  const [storms, setStorms] = useState<Storm[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStorms() {
      try {
        const res = await fetch("/api/storms", { signal: controller.signal });
        if (!res.ok) return;
        const data: Storm[] = await res.json();
        setStorms(data);
      } catch {
        // aborted or network error — ignore
      }
    }

    fetchStorms();
    const id = setInterval(fetchStorms, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return storms;
}
