import { useEffect } from "react";

import { useModuleCounts } from "@/modules/module-context";

export function useModuleCount(moduleId: string, count: number | null) {
  const { registerCount, unregisterCount } = useModuleCounts();

  useEffect(() => {
    registerCount(moduleId, count);
  }, [moduleId, count, registerCount]);

  useEffect(() => {
    return () => unregisterCount(moduleId);
  }, [moduleId, unregisterCount]);
}
