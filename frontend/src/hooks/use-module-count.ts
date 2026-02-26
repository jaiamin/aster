import { useEffect } from "react";
import { useModules } from "@/modules/module-context";

export function useModuleCount(moduleId: string, count: number) {
  const { registerCount, unregisterCount } = useModules();

  useEffect(() => {
    registerCount(moduleId, count);
  }, [moduleId, count, registerCount]);

  useEffect(() => {
    return () => unregisterCount(moduleId);
  }, [moduleId, unregisterCount]);
}
