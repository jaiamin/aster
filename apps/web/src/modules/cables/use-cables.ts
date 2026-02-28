import { usePolledData } from "@/hooks/use-polled-data";
import type { CableData } from "@/types/cables";

export function useCables() {
  const { data } = usePolledData<CableData>({ endpoint: "/api/cables" });
  return data;
}
