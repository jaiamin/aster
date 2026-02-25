import { useEffect, useState } from "react";
import { Radiation } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { NuclearLayer } from "./nuclear-layer";
import type { NuclearFacility } from "@/types/nuclear";

function useNuclearCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/nuclear")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NuclearFacility[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const nuclearModule: ModuleDefinition = {
  id: "nuclear",
  name: "Nuclear Facilities",
  category: "Infrastructure",
  icon: Radiation,
  MapLayer: NuclearLayer,
  useCount: useNuclearCount,
};
