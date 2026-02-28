import type { PickingInfo } from "@deck.gl/core";
import { ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import { useMap } from "@vis.gl/react-maplibre";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { SatelliteSelectionProvider, useSatelliteSelection } from "./satellite-context";
import { SatelliteDetailCard } from "./satellite-detail-card";
import { useSatelliteOrbit } from "./use-satellite-orbit";
import { useSatellitePositions } from "./use-satellite-positions";
import { useSatellites } from "./use-satellites";

import { DeckGLOverlay } from "@/components/globe/deckgl-overlay";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { useModuleSelect } from "@/hooks/use-module-select";
import { useRegionCount } from "@/hooks/use-region-count";
import { useRegionMembership } from "@/hooks/use-region-membership";
import { useExplorerFilters } from "@/modules/explorer-context";
import type { SatellitePosition, GPRecord, OrbitPoint } from "@/types/satellites";

// Camera altitude ≈ 40 000 km / 2^zoom.  We want the camera at least 2×
// the satellite's altitude so the dot is comfortably in view, clamped to [0, 4].
export function zoomForAltitude(altitudeMeters: number): number {
  const altKm = altitudeMeters / 1000;
  const zoom = Math.log2(40_000 / (altKm * 2));
  return Math.max(0, Math.min(4, Math.floor(zoom)));
}

function useUnwrappedPositions(positions: SatellitePosition[]): SatellitePosition[] {
  const prevRef = useRef(new Map<number, number>());
  return useMemo(() => {
    const prev = prevRef.current;
    const next = new Map<number, number>();
    const result = positions.map((p) => {
      const prevLng = prev.get(p.id);
      let lng = p.longitude;
      if (prevLng != null) {
        while (lng - prevLng > 180) lng -= 360;
        while (lng - prevLng < -180) lng += 360;
      }
      next.set(p.id, lng);
      return lng === p.longitude ? p : { ...p, longitude: lng };
    });
    prevRef.current = next;
    return result;
  }, [positions]);
}

function SatellitesLayerInner({
  positions,
  records,
  inRegionSet,
  regionActive,
}: {
  positions: SatellitePosition[];
  records: GPRecord[];
  inRegionSet: Set<string | number>;
  regionActive: boolean;
}) {
  const { current: mapRef } = useMap();
  const { selected, tracking, select, deselect, pauseTracking } = useSatelliteSelection();
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  });
  const trackingRef = useRef(tracking);
  useEffect(() => {
    trackingRef.current = tracking;
  });
  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  });

  const flyingToRef = useRef(false);
  const deckClickedRef = useRef(false);

  const selectFromExplorer = useCallback(
    (item: unknown) => {
      const sat = item as SatellitePosition;
      const gp = recordsRef.current.find((r) => r.NORAD_CAT_ID === sat.id);
      if (gp) {
        flyingToRef.current = true;
        select(sat, gp);
        const map = mapRef?.getMap();
        if (map) {
          map.flyTo({
            center: [sat.longitude, sat.latitude],
            zoom: zoomForAltitude(sat.altitude ?? 400_000),
            duration: 1500,
            padding: DETAIL_CARD_PADDING,
          });
          map.once("moveend", () => {
            flyingToRef.current = false;
          });
        }
      }
    },
    [select, mapRef],
  );
  useModuleSelect("satellites", selectFromExplorer);

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
        if ((e.originalEvent as MouseEvent & { _layerHandled?: boolean })._layerHandled) return;
        if (selectedRef.current) deselect();
      });
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
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
      padding: DETAIL_CARD_PADDING,
    });
  }, [selected?.position.longitude, selected?.position.latitude, mapRef, tracking]);

  const orbitSegments = useSatelliteOrbit(selected?.gp ?? null);
  const selectedId = selected?.position.id ?? null;

  // Unwrap longitudes so they're continuous between frames.
  // Without this, satellites crossing the antimeridian (180° → -180°)
  // get interpolated the long way around (358° sweep) by deck.gl transitions.
  const smoothPositions = useUnwrappedPositions(positions);

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
            padding: DETAIL_CARD_PADDING,
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
                segment.map((p) => [p.longitude, p.latitude, p.altitude]) as never,
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
        data: smoothPositions,
        getPosition: (d) => [d.longitude, d.latitude, d.altitude],
        getFillColor: (d) => {
          if (d.id === selectedId) return [255, 255, 255, 255];
          if (d.id === 25544) return [255, 200, 50, 255];
          if (regionActive && !inRegionSet.has(d.id)) return [239, 68, 68, 50];
          return [239, 68, 68, 200];
        },
        stroked: true,
        getLineColor: (d) => {
          if (d.id === selectedId) return [252, 165, 165, 255];
          if (d.id === 25544) return [255, 220, 100, 255];
          if (regionActive && !inRegionSet.has(d.id)) return [252, 165, 165, 50];
          return [252, 165, 165, 255];
        },
        lineWidthMinPixels: 1,
        getRadius: (d) => (d.id === selectedId ? 7 : d.id === 25544 ? 6 : 5),
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 8,
        antialiasing: true,
        pickable: true,
        onClick,
        transitions: { getPosition: { duration: 2000, type: "interpolation" } },
        updateTriggers: {
          getFillColor: [selectedId, inRegionSet],
          getLineColor: [selectedId, inRegionSet],
          getRadius: selectedId,
        },
      }),
    ],
    [smoothPositions, onClick, orbitSegments, selectedId, regionActive, inRegionSet],
  );

  return <DeckGLOverlay layers={layers} />;
}

export function SatellitesLayer() {
  const records = useSatellites();
  const positions = useSatellitePositions(records ?? []);

  useModuleData("satellites", records === null ? null : positions);

  const matchesFilters = useExplorerFilters("satellites");
  const filtered = useMemo(
    () => (records === null ? positions : positions.filter(matchesFilters)),
    [records, positions, matchesFilters],
  );

  useModuleCount("satellites", records === null ? null : filtered.length);

  const { inRegionSet, regionCount, regionActive } = useRegionMembership(
    records === null ? [] : filtered,
    (p) => p.id,
    (p) => p.longitude,
    (p) => p.latitude,
  );
  useRegionCount("satellites", records === null ? null : regionCount);

  return (
    <SatelliteSelectionProvider positions={filtered}>
      <SatellitesLayerInner
        positions={filtered}
        records={records ?? []}
        inRegionSet={inRegionSet}
        regionActive={regionActive}
      />
      <SatelliteDetailCard />
    </SatelliteSelectionProvider>
  );
}
