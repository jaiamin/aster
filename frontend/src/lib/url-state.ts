import type { MapViewState } from "@/types/map";
import { INITIAL_VIEW_STATE } from "@/config/map";

interface UrlState {
  viewState: MapViewState;
  layers: string[];
  style: string;
  searchQuery: string;
}

export function parseUrlState(): Partial<UrlState> {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};

  const params = new URLSearchParams(hash);
  const result: Partial<UrlState> = {};

  const map = params.get("map");
  if (map) {
    const parts = map.split("/");
    if (parts.length >= 3) {
      const zoom = parseFloat(parts[0]);
      const latitude = parseFloat(parts[1]);
      const longitude = parseFloat(parts[2]);
      const bearing = parts.length > 3 ? parseFloat(parts[3]) : 0;
      const pitch = parts.length > 4 ? parseFloat(parts[4]) : 0;

      if ([zoom, latitude, longitude, bearing, pitch].every((n) => Number.isFinite(n))) {
        result.viewState = { zoom, latitude, longitude, bearing, pitch };
      }
    }
  }

  const layers = params.get("layers");
  if (layers) {
    result.layers = layers.split(",").filter(Boolean);
  }

  const style = params.get("style");
  if (style === "dark" || style === "satellite") {
    result.style = style;
  }

  const q = params.get("q");
  if (q) {
    result.searchQuery = q;
  }

  return result;
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function writeUrlState(viewState: MapViewState, layers: Set<string>, style: string, searchQuery?: string) {
  const parts = [
    round(viewState.zoom, 2),
    round(viewState.latitude, 4),
    round(viewState.longitude, 4),
  ];

  if (viewState.bearing !== 0 || viewState.pitch !== 0) {
    parts.push(round(viewState.bearing, 1));
    parts.push(round(viewState.pitch, 1));
  }

  const params = new URLSearchParams();
  params.set("map", parts.join("/"));

  if (layers.size > 0) {
    const sorted = [...layers].sort();
    params.set("layers", sorted.join(","));
  }

  if (style !== "dark") {
    params.set("style", style);
  }

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  const newHash = "#" + params.toString();
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, "", newHash);
  }
}

export function getInitialSearchQuery(): string {
  return parseUrlState().searchQuery ?? "";
}

export function getInitialViewState(): MapViewState {
  return parseUrlState().viewState ?? { ...INITIAL_VIEW_STATE };
}

export function getInitialLayers(): Set<string> {
  const parsed = parseUrlState().layers;
  return parsed ? new Set(parsed) : new Set();
}

export function getInitialStyle(): "dark" | "satellite" {
  const parsed = parseUrlState().style;
  return parsed === "satellite" ? "satellite" : "dark";
}
