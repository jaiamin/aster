import { useEffect, useRef, useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";

interface UsePolledDataOptions<T> {
  endpoint: string;
  interval?: number;
  transform?: (data: unknown) => T;
}

export interface PolledDataResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function usePolledData<T>({
  endpoint,
  interval,
  transform,
}: UsePolledDataOptions<T>): PolledDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const visible = usePageVisibility();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();

    async function fetchData() {
      if (!hasFetched.current) setIsLoading(true);

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(endpoint, { signal: controller.signal });
          if (!res.ok) throw new Error(res.statusText);
          const raw = await res.json();
          setData(transform ? transform(raw) : raw);
          setError(null);
          setIsLoading(false);
          hasFetched.current = true;
          return;
        } catch (e) {
          if (controller.signal.aborted) return;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        }
      }

      setError(new Error(`Failed to fetch ${endpoint}`));
      setIsLoading(false);
    }

    fetchData();
    const id = interval ? setInterval(fetchData, interval) : undefined;

    return () => {
      controller.abort();
      if (id) clearInterval(id);
    };
  }, [visible, endpoint, interval, transform]);

  return { data, error, isLoading };
}
