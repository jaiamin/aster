import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Flame } from "lucide-react";
import { useWildfires } from "./use-wildfires";
import { WildfireSelectionProvider, useWildfireSelection } from "./wildfire-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModules } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { WildfireDetailCard } from "./wildfire-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Wildfire } from "@/types/wildfires";

const MODULE_ID = "wildfires";

const STATUS_VARIANTS = [
  { key: "orange", dotColor: "#ff9800" },
  { key: "red", dotColor: "#ff5722" },
  { key: "extreme", dotColor: "#f44336" },
];

function frpToStatusKey(frp: number): string {
  if (frp >= 200) return "extreme";
  if (frp >= 20) return "red";
  return "orange";
}

function toGeoJSON(fires: Wildfire[], selectedIdx: number | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fires.map((f, i) => {
      const key = frpToStatusKey(f.frp);
      const sel = i === selectedIdx;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
        properties: {
          idx: i,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function WildfiresLayerInner({ fires }: { fires: Wildfire[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useWildfireSelection();
  const firesRef = useRef(fires);
  firesRef.current = fires;

  const selectedIdx = selected
    ? fires.findIndex(
        (f) =>
          f.latitude === selected.fire.latitude &&
          f.longitude === selected.fire.longitude &&
          f.frp === selected.fire.frp,
      )
    : null;

  const geojson = useMemo(() => toGeoJSON(fires, selectedIdx), [fires, selectedIdx]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Flame, bgColor: CATEGORY_COLORS["Natural Events"], statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const idx = feature.properties?.idx;
      const fire = firesRef.current[idx];
      if (fire) {
        select(fire);
        map.flyTo({ center: [fire.longitude, fire.latitude], zoom: FOCUS_ZOOM["wildfires"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} />;
}

export function WildfiresLayer() {
  const fires = useWildfires();
  const { timeFilter } = useModules();
  const filtered = useMemo(
    () => fires ? filterByTime(fires, "wildfires", timeFilter) : null,
    [fires, timeFilter],
  );
  useModuleCount("wildfires", filtered?.length ?? null);
  return (
    <WildfireSelectionProvider>
      <WildfiresLayerInner fires={filtered ?? []} />
      <WildfireDetailCard />
    </WildfireSelectionProvider>
  );
}
