import { usePolledData } from "@/hooks/use-polled-data";
import type { Buoy } from "@/types/buoys";

export function useBuoys() {
  return usePolledData<Buoy[]>({ endpoint: "/api/buoys", interval: 600_000 });
}
