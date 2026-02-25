export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

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
  water: "#070b1a",
  land: "#0d1117",
  roads: "#1a1a2e",
  borders: "#00d4ff44",
  labels: "#8892b0",
  labelHalo: "#0a0a0f",
  buildings: "#111827",
} as const;

export const MIN_ZOOM = 2.5;

export const GLOBE_TRANSITION_ZOOM = { start: 7, end: 12 } as const;
