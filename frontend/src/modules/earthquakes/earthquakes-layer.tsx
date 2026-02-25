import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Activity } from "lucide-react";
import { useEarthquakes } from "./use-earthquakes";
import { EarthquakeSelectionProvider, useEarthquakeSelection } from "./earthquake-context";
import { EarthquakeDetailCard } from "./earthquake-detail-card";
import { registerModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Earthquake } from "@/types/earthquakes";
const MODULE_ID = "earthquakes";

const STATUS_VARIANTS = [
  { key: "green", dotColor: "#22c55e" },
  { key: "yellow", dotColor: "#eab308" },
  { key: "orange", dotColor: "#f97316" },
  { key: "red", dotColor: "#ef4444" },
];

function magToStatusKey(mag: number): string {
  if (mag >= 7.0) return "red";
  if (mag >= 5.5) return "orange";
  if (mag >= 4.0) return "yellow";
  return "green";
}

function toGeoJSON(quakes: Earthquake[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: quakes.map((q) => {
      const key = magToStatusKey(q.magnitude);
      const sel = q.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [q.longitude, q.latitude] },
        properties: {
          id: q.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function EarthquakesLayerInner({ quakes }: { quakes: Earthquake[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useEarthquakeSelection();
  const quakesRef = useRef(quakes);
  quakesRef.current = quakes;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.quake.id ?? null;
  const geojson = useMemo(() => toGeoJSON(quakes, selectedId), [quakes, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    registerModulePins(map, {
      moduleId: MODULE_ID,
      icon: Activity,
      bgColor: CATEGORY_COLORS["Natural Events"],
      statusVariants: STATUS_VARIANTS,
    }).then(() => setReady(true));
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
        const quake = quakesRef.current.find((q) => q.id === id);
        if (quake) {
          select(quake);
          map.flyTo({ center: [quake.longitude, quake.latitude], zoom: FOCUS_ZOOM["earthquakes"], duration: 1500 });
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

export function EarthquakesLayer() {
  const quakes = useEarthquakes();
  return (
    <EarthquakeSelectionProvider>
      <EarthquakesLayerInner quakes={quakes} />
      <EarthquakeDetailCard />
    </EarthquakeSelectionProvider>
  );
}
