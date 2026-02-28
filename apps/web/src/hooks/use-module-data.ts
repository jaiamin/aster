import { useEffect } from "react";

import { useExplorerData } from "@/modules/explorer-context";

export function useModuleData(moduleId: string, data: unknown[] | null) {
  const { registerData, unregisterData } = useExplorerData();

  useEffect(() => {
    if (data) registerData(moduleId, data);
  }, [moduleId, data, registerData]);

  useEffect(() => {
    return () => unregisterData(moduleId);
  }, [moduleId, unregisterData]);
}
