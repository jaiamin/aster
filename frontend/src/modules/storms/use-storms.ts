import { usePolledData } from "@/hooks/use-polled-data";
import type { Storm } from "@/types/storms";

export function useStorms() {
  return usePolledData<Storm[]>({ endpoint: "/api/storms", interval: 300_000 });
}
