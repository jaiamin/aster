import { useState, useCallback, useRef, useEffect } from "react";
import type { MapViewState, ProjectionMode, MapStatus } from "@/types/map";
import { GLOBE_TRANSITION_ZOOM } from "@/config/map";
import { getInitialViewState, writeUrlState } from "@/lib/url-state";

function getProjectionMode(zoom: number): ProjectionMode {
  if (zoom < GLOBE_TRANSITION_ZOOM.start) return "globe";
  if (zoom > GLOBE_TRANSITION_ZOOM.end) return "mercator";
  return "transitioning";
}

function zoomToAltitude(zoom: number): number {
  // Approximate altitude in km from zoom level
  return Math.round(40075 / Math.pow(2, zoom));
}

export function useMapState() {
  const [viewState, setViewState] = useState<MapViewState>(getInitialViewState);

  const projection = getProjectionMode(viewState.zoom);
  const altitude = zoomToAltitude(viewState.zoom);

  const onMove = useCallback(
    (evt: { viewState: MapViewState }) => {
      setViewState(evt.viewState);
    },
    []
  );

  // Debounced URL sync — exposed for AppShell to call with full state
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const syncUrl = useCallback((vs: MapViewState, layers: Set<string>, style: string, searchQuery?: string) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => writeUrlState(vs, layers, style, searchQuery), 300);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const status: MapStatus = { viewState, projection, altitude };

  return { viewState, status, onMove, syncUrl } as const;
}
