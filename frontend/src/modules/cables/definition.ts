import { useEffect, useState } from "react";
import { Cable } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { CablesLayer } from "./cables-layer";
import type { CableData } from "@/types/cables";

function useCableCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/cables")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CableData | null) => {
        if (live && d) setCount(d.cables.features.length);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const cablesModule: ModuleDefinition = {
  id: "cables",
  name: "Submarine Cables",
  category: "Infrastructure",
  icon: Cable,
  MapLayer: CablesLayer,
  useCount: useCableCount,
};
