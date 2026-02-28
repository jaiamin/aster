import { usePolledData } from "@/hooks/use-polled-data";
import type { Launch } from "@/types/launches";

export function useLaunches() {
  const { data } = usePolledData<Launch[]>({ endpoint: "/api/launches", interval: 600_000 });
  return data;
}
