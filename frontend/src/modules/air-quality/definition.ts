import { useEffect, useState } from "react";
import { Wind } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { AirQualityLayer } from "./air-quality-layer";
import type { AirQualityStation } from "@/types/air-quality";

function useAirQualityCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/air-quality")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AirQualityStation[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const airQualityModule: ModuleDefinition = {
  id: "air-quality",
  name: "Air Quality",
  category: "Environment",
  icon: Wind,
  MapLayer: AirQualityLayer,
  useCount: useAirQualityCount,
};
