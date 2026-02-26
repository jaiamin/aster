import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";

export function useDeselectOnEmptyClick(selected: unknown, deselect: () => void) {
  const { current: mapRef } = useMap();
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!(e.originalEvent as any)._layerHandled && selectedRef.current) deselect();
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, deselect]);
}
