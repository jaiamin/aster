import { usePolledData } from "@/hooks/use-polled-data";
import type { Volcano } from "@/types/volcanoes";

export function useVolcanoes() {
  return usePolledData<Volcano[]>({ endpoint: "/api/volcanoes", interval: 300_000 });
}
