import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Rocket } from "lucide-react";
import { useLaunches } from "./use-launches";
import { LaunchSelectionProvider, useLaunchSelection } from "./launch-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { LaunchDetailCard } from "./launch-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { Launch } from "@/types/launches";
const MODULE_ID = "launches";

const STATUS_VARIANTS = [
  { key: "go", dotColor: "#22c55e" },
  { key: "success", dotColor: "#3b82f6" },
  { key: "fail", dotColor: "#ef4444" },
];

function statusToKey(status: string): string {
  if (status === "Success") return "success";
  if (status === "Failure" || status === "Partial Failure") return "fail";
  return "go";
}

function toGeoJSON(launches: Launch[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: launches.map((l) => {
      const key = statusToKey(l.status);
      const sel = l.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [l.longitude, l.latitude] },
        properties: {
          id: l.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function LaunchesLayerInner({ launches }: { launches: Launch[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useLaunchSelection();
  const launchesRef = useRef(launches);
  launchesRef.current = launches;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.launch.id ?? null;
  const geojson = useMemo(() => toGeoJSON(launches, selectedId), [launches, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = { moduleId: MODULE_ID, icon: Rocket, bgColor: CATEGORY_COLORS.Space, statusVariants: STATUS_VARIANTS };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler — selection via centralized dispatcher
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const launch = launchesRef.current.find((l) => l.id === id);
      if (launch) {
        select(launch);
        map.flyTo({ center: [launch.longitude, launch.latitude], zoom: FOCUS_ZOOM["launches"], duration: 1500 });
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

export function LaunchesLayer() {
  const launches = useLaunches();
  useModuleCount("launches", launches?.length ?? null);
  return (
    <LaunchSelectionProvider>
      <LaunchesLayerInner launches={launches ?? []} />
      <LaunchDetailCard />
    </LaunchSelectionProvider>
  );
}
