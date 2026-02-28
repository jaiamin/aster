import { useMap } from "@vis.gl/react-maplibre";
import { useEffect, useState } from "react";

/** Returns the current map zoom level, updated on moveend events. */
export function useMapZoom(): number {
  const { current: mapRef } = useMap();
  const [zoom, setZoom] = useState(() => mapRef?.getMap()?.getZoom() ?? 2);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    setZoom(map.getZoom());

    const handler = () => setZoom(map.getZoom());
    map.on("moveend", handler);
    return () => {
      map.off("moveend", handler);
    };
  }, [mapRef]);

  return zoom;
}
