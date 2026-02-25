export const MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

export type MapStyleMode = "dark" | "satellite";

export const INITIAL_VIEW_STATE = {
  latitude: 20,
  longitude: 0,
  zoom: 2.5,
  bearing: 0,
  pitch: 0,
} as const;

export const THEME = {
  background: "#0a0a0f",
  accent: "#00d4ff",
  accentDim: "#00d4ff44",
  water: "#0c1a2e",
  land: "#1a2233",
  roads: "#2a3a52",
  roadsMajor: "#354868",
  borders: "#4a90d9aa",
  labels: "#c8d2e0",
  labelHalo: "#0f1520",
  buildings: "#1e2d42",
} as const;

export const MIN_ZOOM = 2.5;

export const GLOBE_TRANSITION_ZOOM = { start: 7, end: 12 } as const;
