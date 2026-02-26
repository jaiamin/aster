import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Radiation } from "lucide-react";
import { useNuclear } from "./use-nuclear";
import { NuclearSelectionProvider, useNuclearSelection } from "./nuclear-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { NuclearDetailCard } from "./nuclear-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { NuclearFacility } from "@/types/nuclear";
const MODULE_ID = "nuclear";

const STATUS_VARIANTS = [
  { key: "green", dotColor: "#00e400" },
  { key: "yellow", dotColor: "#ffff00" },
  { key: "blue", dotColor: "#00bfff" },
  { key: "orange", dotColor: "#ff7e00" },
  { key: "gray", dotColor: "#888888" },
];

function statusToKey(status: string): string {
  if (status === "Operational") return "green";
  if (status === "Under Construction") return "yellow";
  if (status === "Planned") return "blue";
  if (status.startsWith("Suspended")) return "orange";
  return "gray";
}

function toGeoJSON(facilities: NuclearFacility[], selectedId: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: facilities.map((f) => {
      const key = statusToKey(f.status);
      const sel = f.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
        properties: {
          id: f.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function NuclearLayerInner({ facilities }: { facilities: NuclearFacility[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useNuclearSelection();
  const facilitiesRef = useRef(facilities);
  facilitiesRef.current = facilities;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.facility.id ?? null;
  const geojson = useMemo(() => toGeoJSON(facilities, selectedId), [facilities, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: Radiation, bgColor: CATEGORY_COLORS.Infrastructure, statusVariants: STATUS_VARIANTS };
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
        const facility = facilitiesRef.current.find((f) => f.id === id);
        if (facility) {
          select(facility);
          map.flyTo({ center: [facility.longitude, facility.latitude], zoom: FOCUS_ZOOM["nuclear"], duration: 1500 });
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

export function NuclearLayer() {
  const facilities = useNuclear();
  useModuleCount("nuclear", facilities.length);
  return (
    <NuclearSelectionProvider>
      <NuclearLayerInner facilities={facilities} />
      <NuclearDetailCard />
    </NuclearSelectionProvider>
  );
}
