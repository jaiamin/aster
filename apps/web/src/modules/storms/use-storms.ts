import { usePolledData } from "@/hooks/use-polled-data";
import type { Storm } from "@/types/storms";

export function useStorms() {
  const { data } = usePolledData<Storm[]>({ endpoint: "/api/storms", interval: 300_000 });
  return data;
}
