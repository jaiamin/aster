import { useState, useCallback } from "react";
import type { MapViewState, ProjectionMode, MapStatus } from "@/types/map";
import { INITIAL_VIEW_STATE, GLOBE_TRANSITION_ZOOM } from "@/config/map";

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
  const [viewState, setViewState] = useState<MapViewState>({
    latitude: INITIAL_VIEW_STATE.latitude,
    longitude: INITIAL_VIEW_STATE.longitude,
    zoom: INITIAL_VIEW_STATE.zoom,
    bearing: INITIAL_VIEW_STATE.bearing,
    pitch: INITIAL_VIEW_STATE.pitch,
  });

  const projection = getProjectionMode(viewState.zoom);
  const altitude = zoomToAltitude(viewState.zoom);

  const onMove = useCallback(
    (evt: { viewState: MapViewState }) => {
      setViewState(evt.viewState);
    },
    []
  );

  const status: MapStatus = { viewState, projection, altitude };

  return { viewState, status, onMove } as const;
}
