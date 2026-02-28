import { usePolledData } from "@/hooks/use-polled-data";
import type { Airport } from "@/types/airports";

export function useAirports() {
  const { data } = usePolledData<Airport[]>({ endpoint: "/api/airports" });
  return data;
}
