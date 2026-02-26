import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { PlaneTakeoff } from "lucide-react";
import { useAirports } from "./use-airports";
import { AirportSelectionProvider, useAirportSelection } from "./airport-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { AirportDetailCard } from "./airport-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Airport } from "@/types/airports";
const MODULE_ID = "airports";

function toGeoJSON(airports: Airport[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: airports.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: {
        id: a.id,
        pinImage: a.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
      },
    })),
  };
}

function AirportsLayerInner({ airports }: { airports: Airport[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useAirportSelection();
  const airportsRef = useRef(airports);
  airportsRef.current = airports;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.airport.id ?? null;
  const geojson = useMemo(() => toGeoJSON(airports, selectedId), [airports, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: PlaneTakeoff, bgColor: CATEGORY_COLORS.Transportation };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;
      const features = map.queryRenderedFeatures(e.point, { layers: [`${MODULE_ID}-pins`] });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const airport = airportsRef.current.find((a) => a.id === id);
        if (airport) {
          select(airport);
          map.flyTo({ center: [airport.longitude, airport.latitude], zoom: FOCUS_ZOOM["airports"], duration: 1500 });
        }
      } else if (selectedRef.current && !consumed) {
        deselect();
      }
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, select, deselect]);

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

export function AirportsLayer() {
  const airports = useAirports();
  useModuleCount("airports", airports.length);
  return (
    <AirportSelectionProvider>
      <AirportsLayerInner airports={airports} />
      <AirportDetailCard />
    </AirportSelectionProvider>
  );
}
