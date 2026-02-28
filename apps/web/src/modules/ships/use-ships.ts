import { usePolledData } from "@/hooks/use-polled-data";
import type { Ship } from "@/types/ships";

export function useShips() {
  const { data } = usePolledData<Ship[]>({ endpoint: "/api/ships", interval: 30_000 });
  return data;
}
