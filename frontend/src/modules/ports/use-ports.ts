import { useEffect, useState } from "react";
import type { Port } from "@/types/ports";

export function usePorts() {
  const [ports, setPorts] = useState<Port[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPorts() {
      try {
        const res = await fetch("/api/ports", { signal: controller.signal });
        if (!res.ok) return;
        const data: Port[] = await res.json();
        setPorts(data);
      } catch {
        // aborted or network error
      }
    }

    fetchPorts();

    return () => {
      controller.abort();
    };
  }, []);

  return ports;
}
