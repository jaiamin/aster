import { useEffect, useState } from "react";
import { Plane } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { FlightsLayer } from "./flights-layer";

function useFlightCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/flights")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d) setCount(d.flights.length); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return count;
}

export const flightsModule: ModuleDefinition = {
  id: "flights",
  name: "Flights",
  icon: Plane,
  MapLayer: FlightsLayer,
  useCount: useFlightCount,
};
