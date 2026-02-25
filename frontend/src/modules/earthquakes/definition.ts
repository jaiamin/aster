import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { EarthquakesLayer } from "./earthquakes-layer";
import type { Earthquake } from "@/types/earthquakes";

function useEarthquakeCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/earthquakes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Earthquake[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return count;
}

export const earthquakesModule: ModuleDefinition = {
  id: "earthquakes",
  name: "Earthquakes",
  icon: Activity,
  MapLayer: EarthquakesLayer,
  useCount: useEarthquakeCount,
};
