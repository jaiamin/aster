import { useEffect } from "react";
import { useRegion } from "@/modules/module-context";

export function useRegionCount(moduleId: string, count: number | null) {
  const { registerRegionCount, unregisterRegionCount } = useRegion();

  useEffect(() => {
    registerRegionCount(moduleId, count);
  }, [moduleId, count, registerRegionCount]);

  useEffect(() => {
    return () => unregisterRegionCount(moduleId);
  }, [moduleId, unregisterRegionCount]);
}
