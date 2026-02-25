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
function splitAtAntimeridian(points: OrbitPoint[]): OrbitPoint[][] {
  const segments: OrbitPoint[][] = [[]];
  for (let i = 0; i < points.length; i++) {
    segments[segments.length - 1].push(points[i]);
    if (
      i < points.length - 1 &&
      Math.abs(points[i + 1].longitude - points[i].longitude) > 180
    ) {
      segments.push([]);
    }
  }
  return segments.filter((s) => s.length > 1);
}

export function useSatelliteOrbit(gp: GPRecord | null) {
  const [points, setPoints] = useState<OrbitPoint[]>([]);

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

  useEffect(() => {
    if (!satrecRef.current || !gpRef.current) {
      setPoints([]);
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
      const result: OrbitPoint[] = [];

      for (let m = -halfPeriod; m <= halfPeriod; m += stepMinutes) {
        const time = new Date(now + m * 60_000);
        const posVel = propagate(rec, time);
        if (!posVel.position || typeof posVel.position === "boolean") continue;

        const gmst = gstime(time);
        const geodetic = eciToGeodetic(posVel.position, gmst);
        result.push({
          longitude: degreesLong(geodetic.longitude),
          latitude: degreesLat(geodetic.latitude),
          altitude: geodetic.height * 1000, // km → meters
        });
      }

      setPoints(result);
    }

    propagateOrbit();
    const id = setInterval(propagateOrbit, 30_000);
    return () => clearInterval(id);
  }, [satrec]);

  const segments = useMemo(() => {
    if (points.length < 2) return [];
    return splitAtAntimeridian(points);
  }, [points]);

  return segments;
}
