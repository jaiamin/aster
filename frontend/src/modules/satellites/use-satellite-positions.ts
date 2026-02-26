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
import { usePageVisibility } from "@/hooks/use-page-visibility";
import type { GPRecord, SatellitePosition } from "@/types/satellites";

export function useSatellitePositions(gpRecords: GPRecord[]) {
  const [version, setVersion] = useState(0);
  const visible = usePageVisibility();
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

  // Pre-allocate positions array once when satrecs changes
  const positionsRef = useRef<SatellitePosition[]>([]);
  useEffect(() => {
    positionsRef.current = satrecs.map(({ id, name }) => ({
      id,
      name,
      longitude: 0,
      latitude: 0,
      altitude: 0,
    }));
  }, [satrecs]);

  const positionsCountRef = useRef(0);
  const satrecsRef = useRef(satrecs);
  satrecsRef.current = satrecs;

  useEffect(() => {
    if (satrecsRef.current.length === 0 || !visible) return;

    function propagateAll() {
      const now = new Date();
      const gmst = gstime(now);
      const recs = satrecsRef.current;
      const positions = positionsRef.current;
      let writeIdx = 0;

      for (let i = 0; i < recs.length; i++) {
        const { id, name, satrec } = recs[i];
        const posVel = propagate(satrec, now);
        if (
          !posVel.position ||
          typeof posVel.position === "boolean"
        )
          continue;

        const geodetic = eciToGeodetic(posVel.position, gmst);
        if (writeIdx >= positions.length) {
          positions.push({ id: 0, name: "", longitude: 0, latitude: 0, altitude: 0 });
        }
        const pos = positions[writeIdx];
        pos.id = id;
        pos.name = name;
        pos.longitude = degreesLong(geodetic.longitude);
        pos.latitude = degreesLat(geodetic.latitude);
        pos.altitude = geodetic.height * 1000;
        writeIdx++;
      }

      positionsCountRef.current = writeIdx;
      setVersion((v) => v + 1);
    }

    propagateAll();
    const id = setInterval(propagateAll, 2000);
    return () => clearInterval(id);
  }, [satrecs, visible]);

  // Return only valid entries — version change triggers re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => positionsRef.current.slice(0, positionsCountRef.current), [version]);
}
