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
    const isDev = import.meta.env.DEV;

    async function fetchData() {
      if (!hasFetched.current) setIsLoading(true);

      const markPrefix = `fetch:${endpoint}`;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (isDev) performance.mark(`${markPrefix}:start`);

          const res = await fetch(endpoint, { signal: controller.signal });
          if (!res.ok) throw new Error(res.statusText);
          const raw = await res.json();

          if (isDev) {
            performance.mark(`${markPrefix}:end`);
            performance.measure(markPrefix, `${markPrefix}:start`, `${markPrefix}:end`);
          }

          setData(transform ? transform(raw) : raw);
          setError(null);
          setIsLoading(false);
          hasFetched.current = true;
          return;
        } catch {
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
