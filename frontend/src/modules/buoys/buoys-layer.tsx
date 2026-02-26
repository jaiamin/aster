import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Navigation } from "lucide-react";
import { useBuoys } from "./use-buoys";
import { BuoySelectionProvider, useBuoySelection } from "./buoy-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleFilter } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { BuoyDetailCard } from "./buoy-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Buoy } from "@/types/buoys";

const MODULE_ID = "buoys";

function toGeoJSON(buoys: Buoy[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: buoys.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
      properties: {
        id: b.id,
        pinImage: b.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
      },
    })),
  };
}

function BuoysLayerInner({ buoys }: { buoys: Buoy[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useBuoySelection();
  const buoysRef = useRef(buoys);
  buoysRef.current = buoys;

  const selectedId = selected?.buoy.id ?? null;
  const geojson = useMemo(() => toGeoJSON(buoys, selectedId), [buoys, selectedId]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Navigation, bgColor: CATEGORY_COLORS.Environment });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const buoy = buoysRef.current.find((b) => b.id === id);
      if (buoy) {
        select(buoy);
        map.flyTo({ center: [buoy.longitude, buoy.latitude], zoom: FOCUS_ZOOM["buoys"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={10} />;
}

export function BuoysLayer() {
  const buoys = useBuoys();
  const { timeFilter } = useModuleFilter();
  const filtered = useMemo(
    () => buoys ? filterByTime(buoys, "buoys", timeFilter) : null,
    [buoys, timeFilter],
  );
  useModuleCount("buoys", filtered?.length ?? null);
  return (
    <BuoySelectionProvider>
      <BuoysLayerInner buoys={filtered ?? []} />
      <BuoyDetailCard />
    </BuoySelectionProvider>
  );
}
