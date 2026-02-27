import { useEffect } from "react";
import { useExplorer } from "@/modules/explorer-context";

export function useModuleSelect(moduleId: string, handler: (item: any) => void) {
  const { registerSelect } = useExplorer();

  useEffect(() => {
    return registerSelect(moduleId, handler);
  }, [moduleId, handler, registerSelect]);
}
