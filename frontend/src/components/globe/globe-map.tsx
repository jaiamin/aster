import { useCallback, useEffect, type ReactNode } from "react";
import { Map, type MapRef, useMap } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { THEME, MIN_ZOOM } from "@/config/map";
import type { MapStyleMode } from "@/config/map";
import { useMapStyle } from "@/hooks/use-map-style";
import { attachClickDispatcher } from "@/lib/layer-click";
import type { MapViewState } from "@/types/map";

function ClickDispatcher() {
  const { current: mapRef } = useMap();
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    return attachClickDispatcher(map);
  }, [mapRef]);
  return null;
}

interface GlobeMapProps {
  viewState: MapViewState;
  onMove: (evt: { viewState: MapViewState }) => void;
  styleMode: MapStyleMode;
  onMapReady?: (map: maplibregl.Map) => void;
  children?: ReactNode;
}

export function GlobeMap({ viewState, onMove, styleMode, onMapReady, children }: GlobeMapProps) {
  const mapStyle = useMapStyle(styleMode);

  const handleRef = useCallback(
    (ref: MapRef | null) => {
      if (ref && onMapReady) onMapReady(ref.getMap());
    },
    [onMapReady],
  );

  if (!mapStyle) return <div className="h-full w-full" style={{ background: THEME.background }} />;

  return (
    <div className="h-full w-full" style={{ background: THEME.background }}>
      <Map
        ref={handleRef}
        {...viewState}
        onMove={onMove}
        mapStyle={mapStyle}
        initialViewState={undefined}
        projection={{ type: "globe" }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        minZoom={MIN_ZOOM}
        maxPitch={85}
        maxTileCacheSize={50}
      >
        <ClickDispatcher />
        {children}
      </Map>
    </div>
  );
}
