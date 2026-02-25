import { useEffect, useState } from "react";
import { Anchor } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { PortsLayer } from "./ports-layer";
import type { Port } from "@/types/ports";

function usePortCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/ports")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Port[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const portsModule: ModuleDefinition = {
  id: "ports",
  name: "Ports",
  category: "Transportation",
  icon: Anchor,
  focusZoom: FOCUS_ZOOM["ports"],
  MapLayer: PortsLayer,
  useCount: usePortCount,
};
