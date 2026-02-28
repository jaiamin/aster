import { usePolledData } from "@/hooks/use-polled-data";
import type { Earthquake } from "@/types/earthquakes";

export function useEarthquakes() {
  const { data } = usePolledData<Earthquake[]>({ endpoint: "/api/earthquakes", interval: 60_000 });
  return data;
}
