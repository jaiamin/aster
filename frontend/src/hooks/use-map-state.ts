import { useState, useCallback, useRef, useEffect } from "react";
import type { MapViewState, ProjectionMode, MapStatus } from "@/types/map";
import { GLOBE_TRANSITION_ZOOM } from "@/config/map";
import { getInitialViewState, writeUrlState } from "@/lib/url-state";
import type { TimePreset } from "@/lib/time-filter";

function getProjectionMode(zoom: number): ProjectionMode {
  if (zoom < GLOBE_TRANSITION_ZOOM.start) return "globe";
  if (zoom > GLOBE_TRANSITION_ZOOM.end) return "mercator";
  return "transitioning";
}

function zoomToAltitude(zoom: number): number {
  return Math.round(40075 / Math.pow(2, zoom));
}

function buildStatus(vs: MapViewState): MapStatus {
  return { viewState: vs, projection: getProjectionMode(vs.zoom), altitude: zoomToAltitude(vs.zoom) };
}

const STATUS_INTERVAL_MS = 1000 / 15; // ~15fps

export function useMapState() {
  const [viewState, setViewState] = useState<MapViewState>(getInitialViewState);
  const [status, setStatus] = useState<MapStatus>(() => buildStatus(getInitialViewState()));

  const rafRef = useRef(0);
  const lastFlushRef = useRef(0);
  const pendingFlushRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestVsRef = useRef(viewState);

  const onMove = useCallback(
    (evt: { viewState: MapViewState }) => {
      const vs = evt.viewState;
      setViewState(vs);
      latestVsRef.current = vs;

      // Throttle derived status updates to ~15fps during continuous interaction
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          const now = performance.now();
          if (now - lastFlushRef.current >= STATUS_INTERVAL_MS) {
            lastFlushRef.current = now;
            setStatus(buildStatus(latestVsRef.current));
          }
        });
      }

      // Schedule a trailing flush to catch the final state after movement stops
      clearTimeout(pendingFlushRef.current);
      pendingFlushRef.current = setTimeout(() => {
        setStatus(buildStatus(latestVsRef.current));
      }, 100);
    },
    [],
  );

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(pendingFlushRef.current);
  }, []);

  // Debounced URL sync
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncUrl = useCallback((vs: MapViewState, layers: Set<string>, style: string, searchQuery?: string, timeFilter?: TimePreset) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => writeUrlState(vs, layers, style, searchQuery, timeFilter), 300);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { viewState, status, onMove, syncUrl } as const;
}
