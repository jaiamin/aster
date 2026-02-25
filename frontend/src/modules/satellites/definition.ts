import { useEffect, useState } from "react";
import { Satellite } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { SatellitesLayer } from "./satellites-layer";

function useSatelliteCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/satellites")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && Array.isArray(d)) setCount(d.length); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const satellitesModule: ModuleDefinition = {
  id: "satellites",
  name: "Satellites",
  category: "Space",
  icon: Satellite,
  focusZoom: FOCUS_ZOOM["satellites"],
  MapLayer: SatellitesLayer,
  useCount: useSatelliteCount,
  quickPicks: [{ name: "ISS (ZARYA)", targetId: 25544 }],
};
