import { useEffect, useState } from "react";
import { PlaneTakeoff } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { AirportsLayer } from "./airports-layer";
import type { Airport } from "@/types/airports";

function useAirportCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/airports")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Airport[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const airportsModule: ModuleDefinition = {
  id: "airports",
  name: "Airports",
  category: "Transportation",
  icon: PlaneTakeoff,
  focusZoom: FOCUS_ZOOM["airports"],
  MapLayer: AirportsLayer,
  useCount: useAirportCount,
};
