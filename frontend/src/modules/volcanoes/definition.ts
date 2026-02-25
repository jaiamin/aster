import { useEffect, useState } from "react";
import { Mountain } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { VolcanoesLayer } from "./volcanoes-layer";
import type { Volcano } from "@/types/volcanoes";

function useVolcanoCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/volcanoes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Volcano[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const volcanoesModule: ModuleDefinition = {
  id: "volcanoes",
  name: "Volcanoes",
  category: "Natural Events",
  icon: Mountain,
  focusZoom: FOCUS_ZOOM["volcanoes"],
  MapLayer: VolcanoesLayer,
  useCount: useVolcanoCount,
};
