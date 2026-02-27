import { usePolledData } from "@/hooks/use-polled-data";
import type { PowerPlant } from "@/types/power-plants";

export function usePowerPlants() {
  return usePolledData<PowerPlant[]>({ endpoint: "/api/power-plants", interval: 3_600_000 });
}
