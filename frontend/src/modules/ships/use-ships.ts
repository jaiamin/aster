import { usePolledData } from "@/hooks/use-polled-data";
import type { Ship } from "@/types/ships";

export function useShips() {
  return usePolledData<Ship[]>({ endpoint: "/api/ships", interval: 30_000 });
}
