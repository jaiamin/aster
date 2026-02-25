import { useControl } from "@vis.gl/react-maplibre";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";

export function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}
