import { Map } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_URL, THEME, MIN_ZOOM } from "@/config/map";
import { transformStyle } from "@/styles/dark-globe-style";
import type { MapViewState } from "@/types/map";
import { GlobeControls } from "./globe-controls";

interface GlobeMapProps {
  viewState: MapViewState;
  onMove: (evt: { viewState: MapViewState }) => void;
}

export function GlobeMap({ viewState, onMove }: GlobeMapProps) {
  return (
    <div className="relative h-full w-full" style={{ background: THEME.background }}>
      <Map
        {...viewState}
        onMove={onMove}
        mapStyle={MAP_STYLE_URL}
        transformStyle={transformStyle}
        initialViewState={undefined}
        projection={{ type: "globe" }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        minZoom={MIN_ZOOM}
        maxPitch={85}
      />
      <GlobeControls viewState={viewState} onMove={onMove} />
    </div>
  );
}
