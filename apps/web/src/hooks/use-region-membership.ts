import { useEffect, useRef, useState } from "react";
import { useRegion } from "@/modules/module-context";

const EMPTY_SET = new Set<string | number>();
let sharedWorker: Worker | null = null;
let requestCounter = 0;

function getWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL("@/lib/region-worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return sharedWorker;
}

type Bbox = [number, number, number, number];

function computeBboxFromGeometry(geometry: GeoJSON.Geometry): Bbox {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;
  const visit = (coords: unknown) => {
    if (typeof (coords as number[])[0] === "number") {
      const [lng, lat] = coords as number[];
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      return;
    }
    for (const c of coords as unknown[]) visit(c);
  };
  if ("coordinates" in geometry) visit((geometry as { coordinates: unknown }).coordinates);
  return [west, south, east, north];
}

export function useRegionMembership<T>(
  items: T[],
  getId: (item: T, index: number) => string | number,
  getLng: (item: T) => number,
  getLat: (item: T) => number,
): { inRegionSet: Set<string | number>; regionCount: number | null; regionActive: boolean } {
  const { regionBoundary, regionActive } = useRegion();
  const [inRegionSet, setInRegionSet] = useState<Set<string | number>>(EMPTY_SET);

  const getIdRef = useRef(getId);
  getIdRef.current = getId;
  const getLngRef = useRef(getLng);
  getLngRef.current = getLng;
  const getLatRef = useRef(getLat);
  getLatRef.current = getLat;

  useEffect(() => {
    if (!regionActive || !regionBoundary || items.length === 0) {
      setInRegionSet(EMPTY_SET);
      return;
    }

    const id = ++requestCounter;
    const points = items.map((item, i) => ({
      id: getIdRef.current(item, i),
      lng: getLngRef.current(item),
      lat: getLatRef.current(item),
    }));

    const bbox = computeBboxFromGeometry(regionBoundary);
    const worker = getWorker();

    const handler = (e: MessageEvent) => {
      if (e.data.requestId === id) {
        setInRegionSet(new Set(e.data.ids));
        worker.removeEventListener("message", handler);
      }
    };
    worker.addEventListener("message", handler);

    worker.postMessage({
      type: "compute",
      requestId: id,
      points,
      polygon: regionBoundary,
      bbox,
    });

    return () => {
      worker.removeEventListener("message", handler);
    };
  }, [items, regionBoundary, regionActive]);

  const regionCount = regionActive ? (inRegionSet === EMPTY_SET ? null : inRegionSet.size) : null;
  return { inRegionSet, regionCount, regionActive };
}
