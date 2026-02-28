import { usePolledData } from "@/hooks/use-polled-data";
import type { Port } from "@/types/ports";

export function usePorts() {
  const { data } = usePolledData<Port[]>({ endpoint: "/api/ports" });
  return data;
}
