import { usePolledData } from "@/hooks/use-polled-data";
import type { CableData } from "@/types/cables";

export function useCables() {
  return usePolledData<CableData>({ endpoint: "/api/cables" });
}
