import { usePolledData } from "@/hooks/use-polled-data";
import type { Port } from "@/types/ports";

export function usePorts() {
  return usePolledData<Port[]>({ endpoint: "/api/ports" });
}
