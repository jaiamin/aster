import { usePolledData } from "@/hooks/use-polled-data";
import type { Volcano } from "@/types/volcanoes";

export function useVolcanoes() {
  const { data } = usePolledData<Volcano[]>({ endpoint: "/api/volcanoes", interval: 300_000 });
  return data;
}
