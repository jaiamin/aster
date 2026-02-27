import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { Anchor } from "lucide-react";
import { usePorts } from "./use-ports";
import { PortSelectionProvider, usePortSelection } from "./port-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegion } from "@/modules/module-context";
import { usePinRegistration } from "@/hooks/use-pin-registration";
import { useDeselectOnEmptyClick } from "@/hooks/use-deselect-on-empty-click";
import { PortDetailCard } from "./port-detail-card";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { ClusteredPinSource } from "@/components/globe/clustered-pin-source";
import type { Port } from "@/types/ports";

const MODULE_ID = "ports";

function toGeoJSON(ports: Port[], selectedId: number | null, isInRegion: (lng: number, lat: number) => boolean): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ports.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id,
        pinImage: p.id === selectedId ? `${MODULE_ID}-pin-selected` : `${MODULE_ID}-pin`,
        inRegion: isInRegion(p.longitude, p.latitude),
      },
    })),
  };
}

function PortsLayerInner({ ports }: { ports: Port[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = usePortSelection();
  const { isInRegion, regionActive } = useRegion();
  const portsRef = useRef(ports);
  portsRef.current = ports;

  const selectedId = selected?.port.id ?? null;
  const geojson = useMemo(() => toGeoJSON(ports, selectedId, isInRegion), [ports, selectedId, isInRegion]);

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
        map.flyTo({ center: [port.longitude, port.latitude], zoom: FOCUS_ZOOM["ports"], duration: 1500 });
      }
    });
  }, [mapRef, select]);

  if (!ready) return null;

  return <ClusteredPinSource moduleId={MODULE_ID} geojson={geojson} clusterMaxZoom={13} regionActive={regionActive} />;
}

export function PortsLayer() {
  const ports = usePorts();
  useModuleCount("ports", ports?.length ?? null);
  const { isInRegion, regionActive } = useRegion();
  const regionCount = useMemo(() => {
    if (!ports || !regionActive) return null;
    return ports.filter((p) => isInRegion(p.longitude, p.latitude)).length;
  }, [ports, regionActive, isInRegion]);
  useRegionCount("ports", regionCount);
  return (
    <PortSelectionProvider>
      <PortsLayerInner ports={ports ?? []} />
      <PortDetailCard />
    </PortSelectionProvider>
  );
}
