import { usePolledData } from "@/hooks/use-polled-data";
import type { Buoy } from "@/types/buoys";

export function useBuoys() {
  const { data } = usePolledData<Buoy[]>({ endpoint: "/api/buoys", interval: 600_000 });
  return data;
}
