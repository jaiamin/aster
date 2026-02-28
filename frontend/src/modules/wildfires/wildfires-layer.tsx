import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Flame } from "lucide-react";
import { useWildfires } from "./use-wildfires";
import { WildfireSelectionProvider, useWildfireSelection } from "./wildfire-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useModuleFilter } from "@/modules/module-context";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { filterByTime } from "@/lib/time-filter";
import { useModuleData } from "@/hooks/use-module-data";
import { useExplorerFilters } from "@/modules/explorer-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { WildfireDetailCard } from "./wildfire-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
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

function toGeoJSON(fires: Wildfire[], selectedIdx: number | null, inRegionSet: Set<string | number>): GeoJSON.FeatureCollection {
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
          inRegion: inRegionSet.size === 0 || inRegionSet.has(i),
        },
      };
    }),
  };
}

function WildfiresLayerInner({ fires, inRegionSet, regionActive }: { fires: Wildfire[]; inRegionSet: Set<string | number>; regionActive: boolean }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useWildfireSelection();
  const selectFromExplorer = useCallback((item: unknown) => {
    const wf = item as Wildfire;
    select(wf);
    const map = mapRef?.getMap();
    if (map && typeof wf.longitude === "number" && typeof wf.latitude === "number") {
      map.flyTo({ center: [wf.longitude, wf.latitude], zoom: FOCUS_ZOOM["wildfires"], duration: 1500, padding: DETAIL_CARD_PADDING });
    }
  }, [select, mapRef]);
  useModuleSelect("wildfires", selectFromExplorer);
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

  const geojson = useMemo(() => toGeoJSON(fires, selectedIdx, inRegionSet), [fires, selectedIdx, inRegionSet]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Flame, bgColor: CATEGORY_COLORS["Events"], statusVariants: STATUS_VARIANTS });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const idx = feature.properties?.idx;
      const fire = firesRef.current[idx];
      if (fire) {
        select(fire);
        map.flyTo({ center: [fire.longitude, fire.latitude], zoom: FOCUS_ZOOM["wildfires"], duration: 1500, padding: DETAIL_CARD_PADDING });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={12} regionActive={regionActive} />;
}

export function WildfiresLayer() {
  const fires = useWildfires();
  const { timeFilter } = useModuleFilter();
  const timeFiltered = useMemo(
    () => fires ? filterByTime(fires, "wildfires", timeFilter) : null,
    [fires, timeFilter],
  );

  useModuleData("wildfires", timeFiltered);

  const matchesFilters = useExplorerFilters("wildfires");
  const filtered = useMemo(
    () => timeFiltered ? timeFiltered.filter(matchesFilters) : null,
    [timeFiltered, matchesFilters],
  );

  useModuleCount("wildfires", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [], (_f, i) => i, (f) => f.longitude, (f) => f.latitude,
  );
  useRegionCount("wildfires", regionCount);
  return (
    <WildfireSelectionProvider>
      <WildfiresLayerInner fires={filtered ?? []} inRegionSet={inRegionSet} regionActive={regionActive} />
      <WildfireDetailCard />
    </WildfireSelectionProvider>
  );
}
