import { useEffect, useState } from "react";
import type { CableData } from "@/types/cables";

export function useCables() {
  const [data, setData] = useState<CableData | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCables() {
      try {
        const res = await fetch("/api/cables", { signal: controller.signal });
        if (!res.ok) return;
        const d: CableData = await res.json();
        setData(d);
      } catch {
        // aborted or network error
      }
    }

    fetchCables();

    return () => {
      controller.abort();
    };
  }, []);

  return data;
}
