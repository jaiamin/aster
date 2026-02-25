import { useEffect, useState } from "react";
import { Ship } from "lucide-react";
import type { ModuleDefinition } from "@/types/modules";
import { ShipsLayer } from "./ships-layer";
import type { Ship as ShipType } from "@/types/ships";

function useShipCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/ships")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ShipType[] | null) => {
        if (live && d) setCount(d.length);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return count;
}

export const shipsModule: ModuleDefinition = {
  id: "ships",
  name: "Ships",
  category: "Transportation",
  icon: Ship,
  MapLayer: ShipsLayer,
  useCount: useShipCount,
};
