import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Wind } from "lucide-react";
import { useAirQuality } from "./use-air-quality";
import { AirQualitySelectionProvider, useAirQualitySelection } from "./air-quality-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { AirQualityDetailCard } from "./air-quality-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { AirQualityStation } from "@/types/air-quality";
const MODULE_ID = "air-quality";

const STATUS_VARIANTS = [
  { key: "good", dotColor: "#00e400" },
  { key: "moderate", dotColor: "#eab308" },
  { key: "unhealthy-sg", dotColor: "#ff7e00" },
  { key: "unhealthy", dotColor: "#ff0000" },
  { key: "hazardous", dotColor: "#8f3f97" },
];

function pm25ToStatusKey(pm25: number): string {
  if (pm25 > 150) return "hazardous";
  if (pm25 > 55) return "unhealthy";
  if (pm25 > 35) return "unhealthy-sg";
  if (pm25 > 12) return "moderate";
  return "good";
}

function toGeoJSON(stations: AirQualityStation[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => {
      const key = pm25ToStatusKey(s.pm25);
      const sel = s.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
        properties: {
          id: s.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function AirQualityLayerInner({ stations }: { stations: AirQualityStation[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useAirQualitySelection();
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.station.id ?? null;
  const geojson = useMemo(() => toGeoJSON(stations, selectedId), [stations, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: Wind, bgColor: CATEGORY_COLORS.Environment, statusVariants: STATUS_VARIANTS };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler — selection via centralized dispatcher
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const station = stationsRef.current.find((s) => s.id === id);
      if (station) {
        select(station);
        map.flyTo({ center: [station.longitude, station.latitude], zoom: FOCUS_ZOOM["air-quality"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  // Deselect on empty click
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!(e.originalEvent as any)._layerHandled && selectedRef.current) deselect();
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, deselect]);

  // Pointer cursor
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.on("mouseenter", `${MODULE_ID}-pins`, onEnter);
    map.on("mouseleave", `${MODULE_ID}-pins`, onLeave);
    return () => {
      map.off("mouseenter", `${MODULE_ID}-pins`, onEnter);
      map.off("mouseleave", `${MODULE_ID}-pins`, onLeave);
    };
  }, [mapRef]);

  if (!ready) return null;

  return (
    <Source id={`${MODULE_ID}-source`} type="geojson" data={geojson}>
      <Layer
        id={`${MODULE_ID}-pins`}
        type="symbol"
        layout={{
          "icon-image": ["get", "pinImage"],
          "icon-size": 1,
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
      />
    </Source>
  );
}

export function AirQualityLayer() {
  const stations = useAirQuality();
  useModuleCount("air-quality", stations?.length ?? null);
  return (
    <AirQualitySelectionProvider>
      <AirQualityLayerInner stations={stations ?? []} />
      <AirQualityDetailCard />
    </AirQualitySelectionProvider>
  );
}
