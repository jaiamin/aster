import { usePolledData } from "@/hooks/use-polled-data";
import type { Airport } from "@/types/airports";

export function useAirports() {
  return usePolledData<Airport[]>({ endpoint: "/api/airports" });
}
