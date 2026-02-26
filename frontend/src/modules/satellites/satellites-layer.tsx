import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import { DeckGLOverlay } from "@/components/globe/deckgl-overlay";
import { useModules } from "@/modules/module-context";
import { useSatellites } from "./use-satellites";
import { useSatellitePositions } from "./use-satellite-positions";
import { SatelliteSelectionProvider, useSatelliteSelection } from "./satellite-context";
import { SatelliteDetailCard } from "./satellite-detail-card";
import { useModuleCount } from "@/hooks/use-module-count";
import { useSatelliteOrbit } from "./use-satellite-orbit";
import type { SatellitePosition, GPRecord, OrbitPoint } from "@/types/satellites";
import type { PickingInfo } from "@deck.gl/core";

// Camera altitude ≈ 40 000 km / 2^zoom.  We want the camera at least 2×
// the satellite's altitude so the dot is comfortably in view, clamped to [0, 4].
export function zoomForAltitude(altitudeMeters: number): number {
  const altKm = altitudeMeters / 1000;
  const zoom = Math.log2(40_000 / (altKm * 2));
  return Math.max(0, Math.min(4, Math.floor(zoom)));
}

function SatellitesLayerInner({
  positions,
  records,
}: {
  positions: SatellitePosition[];
  records: GPRecord[];
}) {
  const { current: mapRef } = useMap();
  const { selected, tracking, select, deselect, pauseTracking } = useSatelliteSelection();
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const flyingToRef = useRef(false);
  const { pendingTarget, clearPendingTarget } = useModules();

  // Handle pending target from quick picks (e.g. ISS)
  useEffect(() => {
    if (!pendingTarget || pendingTarget.moduleId !== "satellites") return;
    const pos = positions.find((p) => p.id === pendingTarget.targetId);
    const gp = records.find((r) => r.NORAD_CAT_ID === pendingTarget.targetId);
    if (!pos || !gp) return;

    clearPendingTarget();
    select(pos, gp);
    const map = mapRef?.getMap();
    if (map) {
      flyingToRef.current = true;
      map.flyTo({
        center: [pos.longitude, pos.latitude],
        zoom: zoomForAltitude(pos.altitude),
        duration: 1500,
      });
      map.once("moveend", () => { flyingToRef.current = false; });
    }
  }, [pendingTarget, positions, records, mapRef, select, clearPendingTarget]);

  // Deselect when clicking empty map space (deck.gl onClick only fires on layer objects)
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      // Defer so deck.gl's onClick fires first and can set a flag
      requestAnimationFrame(() => {
        if (deckClickedRef.current) {
          deckClickedRef.current = false;
          return;
        }
        if ((e.originalEvent as any)._layerHandled) return;
        if (selectedRef.current) deselect();
      });
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, deselect]);

  // Pause tracking on user-initiated map interaction
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleUserMove = () => {
      if (flyingToRef.current || !selectedRef.current || !trackingRef.current) return;
      pauseTracking();
    };

    map.on("dragstart", handleUserMove);
    map.on("wheel", handleUserMove);
    return () => {
      map.off("dragstart", handleUserMove);
      map.off("wheel", handleUserMove);
    };
  }, [mapRef, pauseTracking]);

  // Camera follow — track selected satellite as it moves
  useEffect(() => {
    if (!selected || !mapRef || !tracking || flyingToRef.current) return;
    mapRef.easeTo({
      center: [selected.position.longitude, selected.position.latitude],
      duration: 1000,
    });
  }, [selected?.position.longitude, selected?.position.latitude, mapRef, tracking]);

  const deckClickedRef = useRef(false);
  const orbitSegments = useSatelliteOrbit(selected?.gp ?? null);
  const selectedId = selected?.position.id ?? null;

  const onClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) {
        deckClickedRef.current = true;
        const sat = info.object as SatellitePosition;
        const gp = recordsRef.current.find((r) => r.NORAD_CAT_ID === sat.id);
        if (!gp) return;

        select(sat, gp);
        const map = mapRef?.getMap();
        if (map) {
          flyingToRef.current = true;
          map.flyTo({
            center: [sat.longitude, sat.latitude],
            zoom: zoomForAltitude(sat.altitude),
            duration: 1500,
          });
          map.once("moveend", () => {
            flyingToRef.current = false;
          });
        }
      }
    },
    [mapRef, select],
  );

  const layers = useMemo(
    () => [
      ...(orbitSegments.length > 0
        ? [
            new PathLayer<OrbitPoint[]>({
              id: "satellite-orbit-layer",
              data: orbitSegments,
              getPath: (segment) =>
                segment.map((p) => [p.longitude, p.latitude, p.altitude]),
              getColor: [239, 68, 68, 153],
              getWidth: 1.5,
              widthUnits: "pixels",
              widthMinPixels: 1,
              pickable: false,
            }),
          ]
        : []),
      new ScatterplotLayer<SatellitePosition>({
        id: "satellites-layer",
        data: positions,
        getPosition: (d) => [d.longitude, d.latitude, d.altitude],
        getFillColor: (d) =>
          d.id === selectedId
            ? [239, 68, 68, 255]
            : [255, 180, 50, 200],
        stroked: true,
        getLineColor: (d) =>
          d.id === selectedId
            ? [252, 165, 165, 255]
            : [255, 220, 150, 255],
        lineWidthMinPixels: 1,
        getRadius: (d) => (d.id === selectedId ? 7 : 5),
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 8,
        antialiasing: true,
        pickable: true,
        onClick,
        updateTriggers: {
          getFillColor: selectedId,
          getLineColor: selectedId,
          getRadius: selectedId,
        },
      }),
    ],
    [positions, onClick, orbitSegments, selectedId],
  );

  return <DeckGLOverlay layers={layers} />;
}

export function SatellitesLayer() {
  const records = useSatellites();
  const positions = useSatellitePositions(records);
  useModuleCount("satellites", positions.length);

  return (
    <SatelliteSelectionProvider positions={positions}>
      <SatellitesLayerInner positions={positions} records={records} />
      <SatelliteDetailCard />
    </SatelliteSelectionProvider>
  );
}
