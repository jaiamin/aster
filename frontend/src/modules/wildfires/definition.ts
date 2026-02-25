import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { WildfiresLayer } from "./wildfires-layer";
import type { Wildfire } from "@/types/wildfires";

function useWildfireCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/wildfires")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Wildfire[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return count;
}

export const wildfiresModule: ModuleDefinition = {
  id: "wildfires",
  name: "Wildfires",
  icon: Flame,
  MapLayer: WildfiresLayer,
  useCount: useWildfireCount,
};
