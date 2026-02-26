import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Wind } from "lucide-react";
import { useAirQuality } from "./use-air-quality";
import { AirQualitySelectionProvider, useAirQualitySelection } from "./air-quality-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModules } from "@/modules/module-context";
import { filterByTime } from "@/lib/time-filter";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { AirQualityDetailCard } from "./air-quality-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
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

  const selectedId = selected?.station.id ?? null;
  const geojson = useMemo(() => toGeoJSON(stations, selectedId), [stations, selectedId]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Wind, bgColor: CATEGORY_COLORS.Environment, statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

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

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} />;
}

export function AirQualityLayer() {
  const stations = useAirQuality();
  const { timeFilter } = useModules();
  const filtered = useMemo(
    () => stations ? filterByTime(stations, "air-quality", timeFilter) : null,
    [stations, timeFilter],
  );
  useModuleCount("air-quality", filtered?.length ?? null);
  return (
    <AirQualitySelectionProvider>
      <AirQualityLayerInner stations={filtered ?? []} />
      <AirQualityDetailCard />
    </AirQualitySelectionProvider>
  );
}
