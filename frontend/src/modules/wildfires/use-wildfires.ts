import { usePolledData } from "@/hooks/use-polled-data";
import type { Wildfire } from "@/types/wildfires";

export function useWildfires() {
  return usePolledData<Wildfire[]>({ endpoint: "/api/wildfires", interval: 300_000 });
}
