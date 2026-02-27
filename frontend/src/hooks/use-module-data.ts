import { useEffect } from "react";
import { useExplorer } from "@/modules/explorer-context";

export function useModuleData(moduleId: string, data: unknown[] | null) {
  const { registerData, unregisterData } = useExplorer();

  useEffect(() => {
    if (data) registerData(moduleId, data);
  }, [moduleId, data, registerData]);

  useEffect(() => {
    return () => unregisterData(moduleId);
  }, [moduleId, unregisterData]);
}
