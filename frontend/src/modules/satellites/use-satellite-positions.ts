import { useEffect, useMemo, useRef, useState } from "react";
import {
  json2satrec,
  propagate,
  eciToGeodetic,
  gstime,
  degreesLong,
  degreesLat,
  type SatRec,
} from "satellite.js";
import type { GPRecord, SatellitePosition } from "@/types/satellites";

export function useSatellitePositions(gpRecords: GPRecord[]) {
  const [positions, setPositions] = useState<SatellitePosition[]>([]);
  const satrecs = useMemo(() => {
    const result: { id: number; name: string; satrec: SatRec }[] = [];
    for (const gp of gpRecords) {
      try {
        const satrec = json2satrec(gp);
        result.push({ id: gp.NORAD_CAT_ID, name: gp.OBJECT_NAME, satrec });
      } catch {
        // invalid record — skip
      }
    }
    return result;
  }, [gpRecords]);

  const satrecsRef = useRef(satrecs);
  satrecsRef.current = satrecs;

  useEffect(() => {
    if (satrecsRef.current.length === 0) return;

    function propagateAll() {
      const now = new Date();
      const gmst = gstime(now);
      const result: SatellitePosition[] = [];

      for (const { id, name, satrec } of satrecsRef.current) {
        const posVel = propagate(satrec, now);
        if (
          !posVel.position ||
          typeof posVel.position === "boolean"
        )
          continue;

        const geodetic = eciToGeodetic(posVel.position, gmst);
        result.push({
          id,
          name,
          longitude: degreesLong(geodetic.longitude),
          latitude: degreesLat(geodetic.latitude),
          altitude: geodetic.height * 1000, // km → meters
        });
      }

      setPositions(result);
    }

    propagateAll();
    const id = setInterval(propagateAll, 1000);
    return () => clearInterval(id);
  }, [satrecs]);

  return positions;
}
