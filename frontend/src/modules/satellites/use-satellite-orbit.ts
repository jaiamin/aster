import { useEffect, useMemo, useRef, useState } from "react";
import {
  json2satrec,
  propagate,
  eciToGeodetic,
  gstime,
  degreesLong,
  degreesLat,
} from "satellite.js";
import type { GPRecord, OrbitPoint } from "@/types/satellites";

/** Split orbit into segments at antimeridian crossings */
function splitAtAntimeridian(points: OrbitPoint[], count: number): OrbitPoint[][] {
  const segments: OrbitPoint[][] = [[]];
  for (let i = 0; i < count; i++) {
    segments[segments.length - 1].push(points[i]);
    if (
      i < count - 1 &&
      Math.abs(points[i + 1].longitude - points[i].longitude) > 180
    ) {
      segments.push([]);
    }
  }
  return segments.filter((s) => s.length > 1);
}

export function useSatelliteOrbit(gp: GPRecord | null) {
  const [version, setVersion] = useState(0);

  const satrec = useMemo(() => {
    if (!gp) return null;
    try {
      return json2satrec(gp);
    } catch {
      return null;
    }
  }, [gp]);

  const satrecRef = useRef(satrec);
  satrecRef.current = satrec;

  const gpRef = useRef(gp);
  gpRef.current = gp;

  // Pre-allocate orbit points array
  const pointsRef = useRef<OrbitPoint[]>([]);
  const pointsCountRef = useRef(0);

  useEffect(() => {
    if (!satrecRef.current || !gpRef.current) {
      pointsCountRef.current = 0;
      setVersion((v) => v + 1);
      return;
    }

    function propagateOrbit() {
      const rec = satrecRef.current;
      const record = gpRef.current;
      if (!rec || !record) return;

      const periodMinutes = 1440 / record.MEAN_MOTION;
      const halfPeriod = periodMinutes / 2;
      const stepMinutes = 2;
      const now = Date.now();

      // Estimate max points needed and pre-allocate if needed
      const maxPoints = Math.ceil(periodMinutes / stepMinutes) + 1;
      while (pointsRef.current.length < maxPoints) {
        pointsRef.current.push({ longitude: 0, latitude: 0, altitude: 0 });
      }

      let writeIdx = 0;
      for (let m = -halfPeriod; m <= halfPeriod; m += stepMinutes) {
        const time = new Date(now + m * 60_000);
        const posVel = propagate(rec, time);
        if (!posVel.position || typeof posVel.position === "boolean") continue;

        const gmst = gstime(time);
        const geodetic = eciToGeodetic(posVel.position, gmst);
        const pt = pointsRef.current[writeIdx];
        pt.longitude = degreesLong(geodetic.longitude);
        pt.latitude = degreesLat(geodetic.latitude);
        pt.altitude = geodetic.height * 1000;
        writeIdx++;
      }

      pointsCountRef.current = writeIdx;
      setVersion((v) => v + 1);
    }

    propagateOrbit();
    const id = setInterval(propagateOrbit, 60_000);
    return () => clearInterval(id);
  }, [satrec]);

  const segments = useMemo(() => {
    const count = pointsCountRef.current;
    if (count < 2) return [];
    return splitAtAntimeridian(pointsRef.current, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return segments;
}
