import { useMap } from "@vis.gl/react-maplibre";
import { useEffect, useRef } from "react";

export function useDeselectOnEmptyClick(selected: unknown, deselect: () => void) {
  const { current: mapRef } = useMap();
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  });

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (
        !(e.originalEvent as MouseEvent & { _layerHandled?: boolean })._layerHandled &&
        selectedRef.current
      )
        deselect();
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mapRef, deselect]);
}
