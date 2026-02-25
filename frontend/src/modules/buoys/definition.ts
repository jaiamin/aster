import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { BuoysLayer } from "./buoys-layer";
import type { Buoy } from "@/types/buoys";

function useBuoyCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/buoys")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Buoy[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const buoysModule: ModuleDefinition = {
  id: "buoys",
  name: "Ocean Buoys",
  category: "Environment",
  icon: Navigation,
  focusZoom: FOCUS_ZOOM["buoys"],
  MapLayer: BuoysLayer,
  useCount: useBuoyCount,
};
