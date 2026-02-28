export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export type ProjectionMode = "globe" | "mercator" | "transitioning";

export interface MapStatus {
  viewState: MapViewState;
  projection: ProjectionMode;
  altitude: number;
}
