import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Anchor } from "lucide-react";
import { usePorts } from "./use-ports";
import { PortSelectionProvider, usePortSelection } from "./port-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { useRegionCount } from "@/hooks/use-region-count";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { useModuleSelect } from "@/hooks/use-module-select";
import { PortDetailCard } from "./port-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Port } from "@/types/ports";

const MODULE_ID = "ports";

function toGeoJSON(ports: Port[], selectedId: number | null, inRegionSet: Set<string | number>): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ports.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id,
        pinImage: p.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: inRegionSet.size === 0 || inRegionSet.has(p.id),
      },
    })),
  };
}

function PortsLayerInner({ ports, inRegionSet, regionActive }: { ports: Port[]; inRegionSet: Set<string | number>; regionActive: boolean }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = usePortSelection();
  const selectFromExplorer = useCallback((item: unknown) => {
    const port = item as Port;
    select(port);
    const map = mapRef?.getMap();
    if (map && typeof port.longitude === "number" && typeof port.latitude === "number") {
      map.flyTo({ center: [port.longitude, port.latitude], zoom: FOCUS_ZOOM["ports"], duration: 1500, padding: DETAIL_CARD_PADDING });
    }
  }, [select, mapRef]);
  useModuleSelect("ports", selectFromExplorer);
  const portsRef = useRef(ports);
  portsRef.current = ports;

  const selectedId = selected?.port.id ?? null;
  const geojson = useMemo(() => toGeoJSON(ports, selectedId, inRegionSet), [ports, selectedId, inRegionSet]);

  const ready = usePinRegistration({ moduleId: MODULE_ID, icon: Anchor, bgColor: CATEGORY_COLORS.Infrastructure });
  useDeselectOnEmptyClick(selected, deselect);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const port = portsRef.current.find((p) => p.id === id);
      if (port) {
        select(port);
        map.flyTo({ center: [port.longitude, port.latitude], zoom: FOCUS_ZOOM["ports"], duration: 1500, padding: DETAIL_CARD_PADDING });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={13} regionActive={regionActive} />;
}

export function PortsLayer() {
  const ports = usePorts();

  useModuleData("ports", ports);

  const matchesFilters = useExplorerFilters("ports");
  const filtered = useMemo(
    () => ports ? ports.filter(matchesFilters) : null,
    [ports, matchesFilters],
  );

  useModuleCount("ports", filtered?.length ?? null);
  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    filtered ?? [], (p) => p.id, (p) => p.longitude, (p) => p.latitude,
  );
  useRegionCount("ports", regionCount);
  return (
    <PortSelectionProvider>
      <PortsLayerInner ports={filtered ?? []} inRegionSet={inRegionSet} regionActive={regionActive} />
      <PortDetailCard />
    </PortSelectionProvider>
  );
}
