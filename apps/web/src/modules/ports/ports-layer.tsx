import { Anchor } from "lucide-react";
import { useMemo } from "react";

import { PortSelectionProvider, usePortSelection } from "./port-context";
import { PortDetailCard } from "./port-detail-card";
import { usePorts } from "./use-ports";

import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { usePinLayer } from "@/hooks/use-pin-layer";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { useExplorerFilters } from "@/modules/explorer-context";
import type { Port } from "@/types/ports";

const MODULE_ID = "ports";

function toGeoJSON(
  ports: Port[],
  selectedId: string | number | null,
  inRegionSet: Set<string | number>,
  regionActive: boolean,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ports.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id,
        pinImage: p.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: !regionActive || inRegionSet.has(p.id),
      },
    })),
  };
}

function findItem(items: Port[], feature: maplibregl.GeoJSONFeature) {
  return items.find((p) => p.id === feature.properties?.id);
}

function PortsLayerInner({
  ports,
  inRegionSet,
  regionActive,
}: {
  ports: Port[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { selected, select, deselect } = usePortSelection();
  const selectedId = selected?.port.id ?? null;

  return usePinLayer<Port>({
    moduleId: MODULE_ID,
    items: ports,
    selectedId,
    select,
    deselect,
    selected,
    toGeoJSON,
    findItem,
    icon: Anchor,
    bgColor: CATEGORY_COLORS.Infrastructure,
    clusterMaxZoom: 13,
    inRegionSet,
    regionActive,
  });
}

export function PortsLayer() {
  const ports = usePorts();

  useModuleData("ports", ports);

  const matchesFilters = useExplorerFilters("ports");
  const filtered = useMemo(
    () => (ports ? ports.filter(matchesFilters) : null),
    [ports, matchesFilters],
  );

  useModuleCount("ports", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [],
    (p) => p.id,
    (p) => p.longitude,
    (p) => p.latitude,
  );
  useRegionCount("ports", regionCount);
  return (
    <PortSelectionProvider>
      <PortsLayerInner
        ports={filtered ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <PortDetailCard />
    </PortSelectionProvider>
  );
}
