import { useEffect, useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";

interface UsePolledDataOptions<T> {
  endpoint: string;
  interval?: number;
  transform?: (data: unknown) => T;
}

export function usePolledData<T>({ endpoint, interval, transform }: UsePolledDataOptions<T>): T | null {
  const [data, setData] = useState<T | null>(null);
  const visible = usePageVisibility();

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();

    async function fetchData() {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(endpoint, { signal: controller.signal });
          if (!res.ok) throw new Error(res.statusText);
          const raw = await res.json();
          setData(transform ? transform(raw) : raw);
          return;
        } catch (e) {
          if (controller.signal.aborted) return;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        }
      }
    }

    fetchData();
    const id = interval ? setInterval(fetchData, interval) : undefined;

    return () => {
      controller.abort();
      if (id) clearInterval(id);
    };
  }, [visible, endpoint, interval, transform]);

  return data;
}
