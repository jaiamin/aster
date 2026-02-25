import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useAirQuality } from "./use-air-quality";
import { AirQualitySelectionProvider, useAirQualitySelection } from "./air-quality-context";
import { AirQualityDetailCard } from "./air-quality-detail-card";
import type { AirQualityStation } from "@/types/air-quality";

// EPA AQI color scale for PM2.5 (µg/m³)
const AQI_COLOR: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "pm25"],
  0, "#00e400",
  12, "#00e400",
  13, "#ffff00",
  35, "#ffff00",
  36, "#ff7e00",
  55, "#ff7e00",
  56, "#ff0000",
  150, "#ff0000",
  151, "#8f3f97",
  250, "#8f3f97",
  251, "#7e0023",
];

const FOCUS_ZOOM = 10;

function toGeoJSON(stations: AirQualityStation[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      properties: {
        id: s.id,
        pm25: s.pm25,
        selected: s.id === selectedId,
      },
    })),
  };
}

function AirQualityLayerInner({ stations }: { stations: AirQualityStation[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useAirQualitySelection();
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const selectedId = selected?.station.id ?? null;
  const geojson = useMemo(() => toGeoJSON(stations, selectedId), [stations, selectedId]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["air-quality-core"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const station = stationsRef.current.find((s) => s.id === id);
        if (station) {
          select(station);
          map.flyTo({
            center: [station.longitude, station.latitude],
            zoom: FOCUS_ZOOM,
            duration: 1500,
          });
        }
      } else if (selectedRef.current && !consumed) {
        deselect();
      }
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, select, deselect]);

  // Pointer cursor on hover
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

    map.on("mouseenter", "air-quality-core", onEnter);
    map.on("mouseleave", "air-quality-core", onLeave);
    return () => {
      map.off("mouseenter", "air-quality-core", onEnter);
      map.off("mouseleave", "air-quality-core", onLeave);
    };
  }, [mapRef]);

  return (
    <Source id="air-quality-source" type="geojson" data={geojson}>
      {/* Soft glow halo */}
      <Layer
        id="air-quality-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            1, 3,
            4, 6,
            8, 12,
            12, 20,
          ],
          "circle-color": AQI_COLOR,
          "circle-opacity": 0.2,
          "circle-blur": 1,
        }}
      />

      {/* Core dot */}
      <Layer
        id="air-quality-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            1, 1.5,
            4, 3,
            8, 6,
            12, 10,
          ],
          "circle-color": AQI_COLOR,
          "circle-opacity": 0.9,
          "circle-stroke-color": [
            "case",
            ["get", "selected"],
            "#ffffff",
            "transparent",
          ],
          "circle-stroke-width": ["case", ["get", "selected"], 2, 0],
        }}
      />
    </Source>
  );
}

export function AirQualityLayer() {
  const stations = useAirQuality();
  return (
    <AirQualitySelectionProvider>
      <AirQualityLayerInner stations={stations} />
      <AirQualityDetailCard />
    </AirQualitySelectionProvider>
  );
}
