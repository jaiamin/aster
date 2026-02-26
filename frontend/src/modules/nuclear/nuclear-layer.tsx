import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Radiation } from "lucide-react";
import { useNuclear } from "./use-nuclear";
import { NuclearSelectionProvider, useNuclearSelection } from "./nuclear-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegion } from "@/modules/module-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { NuclearDetailCard } from "./nuclear-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
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

function toGeoJSON(facilities: NuclearFacility[], selectedId: number | null, isInRegion: (lng: number, lat: number) => boolean): GeoJSON.FeatureCollection {
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
          inRegion: isInRegion(f.longitude, f.latitude),
        },
      };
    }),
  };
}

function NuclearLayerInner({ facilities }: { facilities: NuclearFacility[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useNuclearSelection();
  const { isInRegion, regionActive } = useRegion();
  const facilitiesRef = useRef(facilities);
  facilitiesRef.current = facilities;

  const selectedId = selected?.facility.id ?? null;
  const geojson = useMemo(() => toGeoJSON(facilities, selectedId, isInRegion), [facilities, selectedId, isInRegion]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Radiation, bgColor: CATEGORY_COLORS.Infrastructure, statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const facility = facilitiesRef.current.find((f) => f.id === id);
      if (facility) {
        select(facility);
        map.flyTo({ center: [facility.longitude, facility.latitude], zoom: FOCUS_ZOOM["nuclear"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} regionActive={regionActive} />;
}

export function NuclearLayer() {
  const facilities = useNuclear();
  useModuleCount("nuclear", facilities?.length ?? null);
  const { isInRegion, regionActive } = useRegion();
  const regionCount = useMemo(() => {
    if (!facilities || !regionActive) return null;
    return facilities.filter((f) => isInRegion(f.longitude, f.latitude)).length;
  }, [facilities, regionActive, isInRegion]);
  useRegionCount("nuclear", regionCount);
  return (
    <NuclearSelectionProvider>
      <NuclearLayerInner facilities={facilities ?? []} />
      <NuclearDetailCard />
    </NuclearSelectionProvider>
  );
}
