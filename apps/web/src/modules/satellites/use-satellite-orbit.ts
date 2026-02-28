import { useEffect, useMemo, useRef, useState } from "react";
import type { GPRecord, OrbitPoint } from "@/types/satellites";

export function useSatelliteOrbit(gp: GPRecord | null) {
  const [version, setVersion] = useState(0);
  const segmentsRef = useRef<OrbitPoint[][]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("./satellite-worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === "orbit-result") {
        segmentsRef.current = e.data.segments;
        setVersion((v) => v + 1);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const gpRef = useRef(gp);
  gpRef.current = gp;

  useEffect(() => {
    if (!gp) {
      segmentsRef.current = [];
      setVersion((v) => v + 1);
      return;
    }

    function requestOrbit() {
      if (gpRef.current) {
        workerRef.current?.postMessage({ type: "orbit", gp: gpRef.current });
      }
    }

    requestOrbit();
    const id = setInterval(requestOrbit, 60_000);
    return () => clearInterval(id);
  }, [gp]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => segmentsRef.current, [version]);
}
