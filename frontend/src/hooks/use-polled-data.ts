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
      try {
        const res = await fetch(endpoint, { signal: controller.signal });
        if (!res.ok) return;
        const raw = await res.json();
        setData(transform ? transform(raw) : raw);
      } catch {
        // aborted or network error — ignore
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
