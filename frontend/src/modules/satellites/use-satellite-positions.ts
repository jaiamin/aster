import { useEffect, useMemo, useRef, useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import type { GPRecord, SatellitePosition } from "@/types/satellites";

export function useSatellitePositions(gpRecords: GPRecord[]) {
  const [version, setVersion] = useState(0);
  const visible = usePageVisibility();
  const positionsRef = useRef<SatellitePosition[]>([]);
  const positionsCountRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);

  // Build a name lookup for unpacking the flat buffer
  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const gp of gpRecords) {
      map.set(gp.NORAD_CAT_ID, gp.OBJECT_NAME);
    }
    return map;
  }, [gpRecords]);

  // Create worker and handle lifecycle
  useEffect(() => {
    const worker = new Worker(
      new URL("./satellite-worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === "positions") {
        const { count, buffer } = msg as { count: number; buffer: ArrayBuffer };
        const view = new Float64Array(buffer);
        const positions = positionsRef.current;

        // Grow positions array if needed
        while (positions.length < count) {
          positions.push({ id: 0, name: "", longitude: 0, latitude: 0, altitude: 0 });
        }

        for (let i = 0; i < count; i++) {
          const offset = i * 4;
          const pos = positions[i];
          const id = view[offset];
          pos.id = id;
          pos.name = nameById.get(id) ?? "";
          pos.longitude = view[offset + 1];
          pos.latitude = view[offset + 2];
          pos.altitude = view[offset + 3];
        }

        positionsCountRef.current = count;
        setVersion((v) => v + 1);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [nameById]);

  // Send records to worker when they change
  useEffect(() => {
    workerRef.current?.postMessage({ type: "init", records: gpRecords });
  }, [gpRecords]);

  // Set up propagation interval
  useEffect(() => {
    if (gpRecords.length === 0 || !visible) return;

    function requestPropagate() {
      workerRef.current?.postMessage({ type: "propagate" });
    }

    requestPropagate();
    const id = setInterval(requestPropagate, 2000);
    return () => clearInterval(id);
  }, [gpRecords, visible]);

  // Return only valid entries — version change triggers re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => positionsRef.current.slice(0, positionsCountRef.current), [version]);
}
