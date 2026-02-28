import { useEffect } from "react";

import { useExplorerData } from "@/modules/explorer-context";

export function useModuleSelect(moduleId: string, handler: (item: unknown) => void) {
  const { registerSelect } = useExplorerData();

  useEffect(() => {
    return registerSelect(moduleId, handler);
  }, [moduleId, handler, registerSelect]);
}
