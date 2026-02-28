import { useMap } from "@vis.gl/react-maplibre";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { useModuleSelect } from "@/hooks/use-module-select";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";

export interface PinLayerConfig<TItem> {
  moduleId: string;
  items: TItem[];
  selectedId: string | number | null;
  select: (item: TItem) => void;
  deselect: () => void;
  selected: unknown;
  toGeoJSON: (
    items: TItem[],
    selectedId: string | number | null,
    inRegionSet: Set<string | number>,
    regionActive: boolean,
  ) => GeoJSON.FeatureCollection;
  findItem: (items: TItem[], feature: maplibregl.GeoJSONFeature) => TItem | undefined;
  icon: LucideIcon;
  bgColor: string;
  statusVariants?: { key: string; dotColor: string }[];
  clusterMaxZoom?: number;
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}

export function usePinLayer<TItem extends { longitude: number; latitude: number }>(
  config: PinLayerConfig<TItem>,
): React.ReactNode | null {
  const {
    moduleId,
    items,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon,
    bgColor,
    statusVariants,
    clusterMaxZoom = 12,
    inRegionSet,
    regionActive,
  } = config;

  const { current: mapRef } = useMap();

  const selectFromExplorer = useCallback(
    (item: unknown) => {
      const typed = item as TItem;
      select(typed);
      const map = mapRef?.getMap();
      if (map && typeof typed.longitude === "number" && typeof typed.latitude === "number") {
        map.flyTo({
          center: [typed.longitude, typed.latitude],
          zoom: FOCUS_ZOOM[moduleId],
          duration: 1500,
          padding: DETAIL_CARD_PADDING,
        });
      }
    },
    [select, mapRef, moduleId],
  );
  useModuleSelect(moduleId, selectFromExplorer);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  const geojson = useMemo(
    () => toGeoJSON(items, selectedId, inRegionSet, regionActive),
    [items, selectedId, inRegionSet, regionActive, toGeoJSON],
  );

  const ready = usePinRegistration({
    moduleId,
    icon,
    bgColor,
    statusVariants,
  });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${moduleId}-pins`, (feature) => {
      const item = findItem(itemsRef.current, feature);
      if (item) {
        select(item);
        map.flyTo({
          center: [item.longitude, item.latitude],
          zoom: FOCUS_ZOOM[moduleId],
          duration: 1500,
          padding: DETAIL_CARD_PADDING,
        });
      }
    });
  }, [mapRef, select, moduleId, findItem]);

  if (!ready) return null;

  return (
    <ClusteredPinSource
      moduleId={moduleId}
      geojson={geojson}
      clusterMaxZoom={clusterMaxZoom}
      regionActive={regionActive}
    />
  );
}
