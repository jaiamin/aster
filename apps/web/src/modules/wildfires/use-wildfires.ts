import { usePolledData } from "@/hooks/use-polled-data";
import type { Wildfire } from "@/types/wildfires";

export function useWildfires() {
  const { data } = usePolledData<Wildfire[]>({ endpoint: "/api/wildfires", interval: 300_000 });
  return data;
}
