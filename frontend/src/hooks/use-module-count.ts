import { useEffect, useRef } from "react";
import { useModules } from "@/modules/module-context";

export function useModuleCount(moduleId: string, count: number) {
  const { registerCount, unregisterCount } = useModules();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (count > 0) hasFetched.current = true;
    registerCount(moduleId, hasFetched.current ? count : null);
  }, [moduleId, count, registerCount]);

  useEffect(() => {
    return () => unregisterCount(moduleId);
  }, [moduleId, unregisterCount]);
}
