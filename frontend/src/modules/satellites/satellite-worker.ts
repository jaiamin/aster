import {
  json2satrec,
  propagate,
  eciToGeodetic,
  gstime,
  degreesLong,
  degreesLat,
  type SatRec,
} from "satellite.js";
import type { GPRecord } from "@/types/satellites";

interface SatEntry {
  id: number;
  name: string;
  satrec: SatRec;
}

let satrecs: SatEntry[] = [];

type WorkerMessage =
  | { type: "init"; records: GPRecord[] }
  | { type: "propagate" }
  | { type: "orbit"; gp: GPRecord };

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === "init") {
    satrecs = [];
    for (const gp of msg.records) {
      try {
        const satrec = json2satrec(gp);
        satrecs.push({ id: gp.NORAD_CAT_ID, name: gp.OBJECT_NAME, satrec });
      } catch {
        // invalid record — skip
      }
    }
    self.postMessage({ type: "init-done", count: satrecs.length });
    return;
  }

  if (msg.type === "propagate") {
    const now = new Date();
    const gmst = gstime(now);

    // Pack results into a flat Float64Array: [id, lng, lat, alt, ...]
    // Max 4 values per satellite
    const buf = new Float64Array(satrecs.length * 4);
    let writeIdx = 0;

    for (let i = 0; i < satrecs.length; i++) {
      const { id, satrec } = satrecs[i];
      const posVel = propagate(satrec, now);
      if (!posVel.position || typeof posVel.position === "boolean") continue;

      const geodetic = eciToGeodetic(posVel.position, gmst);
      const offset = writeIdx * 4;
      buf[offset] = id;
      buf[offset + 1] = degreesLong(geodetic.longitude);
      buf[offset + 2] = degreesLat(geodetic.latitude);
      buf[offset + 3] = geodetic.height * 1000;
      writeIdx++;
    }

    const result = buf.buffer.slice(0, writeIdx * 4 * 8);
    self.postMessage(
      { type: "positions", count: writeIdx, buffer: result },
      [result] as unknown as Transferable[],
    );
    return;
  }

  if (msg.type === "orbit") {
    const gp = msg.gp;
    let satrec: SatRec;
    try {
      satrec = json2satrec(gp);
    } catch {
      self.postMessage({ type: "orbit-result", segments: [] });
      return;
    }

    const periodMinutes = 1440 / gp.MEAN_MOTION;
    const halfPeriod = periodMinutes / 2;
    const stepMinutes = 2;
    const now = Date.now();

    const points: { longitude: number; latitude: number; altitude: number }[] = [];

    for (let m = -halfPeriod; m <= halfPeriod; m += stepMinutes) {
      const time = new Date(now + m * 60_000);
      const posVel = propagate(satrec, time);
      if (!posVel.position || typeof posVel.position === "boolean") continue;

      const gmsTime = gstime(time);
      const geodetic = eciToGeodetic(posVel.position, gmsTime);
      points.push({
        longitude: degreesLong(geodetic.longitude),
        latitude: degreesLat(geodetic.latitude),
        altitude: geodetic.height * 1000,
      });
    }

    // Split at antimeridian crossings
    const segments: typeof points[] = [[]];
    for (let i = 0; i < points.length; i++) {
      segments[segments.length - 1].push(points[i]);
      if (
        i < points.length - 1 &&
        Math.abs(points[i + 1].longitude - points[i].longitude) > 180
      ) {
        segments.push([]);
      }
    }

    self.postMessage({
      type: "orbit-result",
      segments: segments.filter((s) => s.length > 1),
    });
  }
};
