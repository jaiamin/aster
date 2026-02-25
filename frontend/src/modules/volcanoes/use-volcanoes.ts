import { useEffect, useState } from "react";
import type { Volcano } from "@/types/volcanoes";

const POLL_INTERVAL = 300_000; // 5 minutes

export function useVolcanoes() {
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchVolcanoes() {
      try {
        const res = await fetch("/api/volcanoes", { signal: controller.signal });
        if (!res.ok) return;
        const data: Volcano[] = await res.json();
        setVolcanoes(data);
      } catch {
        // aborted or network error
      }
    }

    fetchVolcanoes();
    const id = setInterval(fetchVolcanoes, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return volcanoes;
}
