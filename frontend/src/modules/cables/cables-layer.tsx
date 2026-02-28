import { useCallback, useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useCables } from "./use-cables";
import { CableSelectionProvider, useCableSelection } from "./cable-context";
import { CableDetailCard } from "./cable-detail-card";
import type { CableData, CableFeature } from "@/types/cables";
import { useModuleCount } from "@/hooks/use-module-count";
import { useModuleData } from "@/hooks/use-module-data";
import { useRegionCount } from "@/hooks/use-region-count";
import { useExplorerFilters } from "@/modules/explorer-context";
import { useRegion } from "@/modules/module-context";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { useModuleSelect } from "@/hooks/use-module-select";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function buildCablesGeoJSON(data: CableData | null, selectedId: string | null, inRegionSet: Set<string | number>, regionActive: boolean): GeoJSON.FeatureCollection {
  if (!data) return EMPTY_FC;
  const features = data.cables.features.map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      selected: f.properties.id === selectedId,
      inRegion: !regionActive || inRegionSet.has(f.properties.id),
    },
  }));
  return { type: "FeatureCollection", features };
}

function CablesLayerInner({ data, inRegionSet, regionActive }: { data: CableData | null; inRegionSet: Set<string | number>; regionActive: boolean }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useCableSelection();
  const selectFromExplorer = useCallback((item: unknown) => {
    const cable = item as CableFeature;
    select(cable);
    const map = mapRef?.getMap();
    if (map && typeof (cable as any).longitude === "number" && typeof (cable as any).latitude === "number") {
      map.flyTo({ center: [(cable as any).longitude, (cable as any).latitude], zoom: FOCUS_ZOOM["cables"], duration: 1500, padding: DETAIL_CARD_PADDING });
    }
  }, [select, mapRef]);
  useModuleSelect("cables", selectFromExplorer);
  const dataRef = useRef(data);
  dataRef.current = data;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const selectedId = selected?.cable.properties.id ?? null;
  const cablesGeojson = useMemo(() => buildCablesGeoJSON(data, selectedId, inRegionSet, regionActive), [data, selectedId, inRegionSet, regionActive]);
  const landingPoints = data?.landingPoints ?? EMPTY_FC;

  // Click handler — selection via centralized dispatcher (register hit layer)
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handler = (feature: maplibregl.GeoJSONFeature) => {
      // Cables are too dense at globe zoom — skip below zoom 3
      if (map.getZoom() < 3) return;
      const id = feature.properties?.id;
      const d = dataRef.current;
      if (d) {
        const cable = d.cables.features.find(
          (f) => f.properties.id === id
        ) as CableFeature | undefined;
        if (cable) select(cable);
      }
    };

    const cleanups = [
      registerLayerClick("cables-hit", handler),
      registerLayerClick("cables-line", handler),
      registerLayerClick("cables-line-selected", handler),
    ];
    return () => { cleanups.forEach((fn) => fn()); };
  }, [mapRef, select]);

  // Deselect on empty click
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!(e.originalEvent as any)._layerHandled && selectedRef.current) deselect();
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, deselect]);

  // Pointer cursor on hover
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

    map.on("mouseenter", "cables-hit", onEnter);
    map.on("mouseleave", "cables-hit", onLeave);
    return () => {
      map.off("mouseenter", "cables-hit", onEnter);
      map.off("mouseleave", "cables-hit", onLeave);
    };
  }, [mapRef]);

  return (
    <>
      <Source id="cables-source" type="geojson" data={cablesGeojson} tolerance={0.5}>
        {/* Invisible wide hit area for easier clicking — hidden at low zoom */}
        <Layer
          id="cables-hit"
          type="line"
          minzoom={3}
          paint={{
            "line-color": "transparent",
            "line-width": ["interpolate", ["linear"], ["zoom"], 3, 6, 6, 14],
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />

        {/* Cable lines — unselected */}
        <Layer
          id="cables-line"
          type="line"
          filter={["!", ["get", "selected"]]}
          paint={{
            "line-color": ["get", "color"],
            "line-opacity": regionActive ? ["case", ["get", "inRegion"], 0.6, 0.12] : 0.6,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              1, 1,
              4, 1.5,
              8, 3,
            ],
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />

        {/* Cable lines — selected: bright + wider */}
        <Layer
          id="cables-line-selected"
          type="line"
          filter={["get", "selected"]}
          paint={{
            "line-color": ["get", "color"],
            "line-opacity": 1,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              1, 2.5,
              4, 3.5,
              8, 5,
            ],
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />

        {/* Selected cable glow */}
        <Layer
          id="cables-line-glow"
          type="line"
          filter={["get", "selected"]}
          paint={{
            "line-color": ["get", "color"],
            "line-opacity": 0.3,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              1, 8,
              4, 12,
              8, 18,
            ],
            "line-blur": 4,
          }}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </Source>

      {/* Landing points */}
      <Source id="landing-points-source" type="geojson" data={landingPoints}>
        <Layer
          id="landing-points"
          type="circle"
          paint={{
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              2, 1,
              6, 2.5,
              10, 5,
            ],
            "circle-color": "#ffffff",
            "circle-opacity": 0.6,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 0.5,
            "circle-stroke-opacity": 0.3,
          }}
        />
      </Source>
    </>
  );
}

export function CablesLayer() {
  const data = useCables();
  const features = useMemo(() => data?.cables.features ?? null, [data]);

  useModuleData("cables", features);

  const matchesFilters = useExplorerFilters("cables");
  const filteredData = useMemo(() => {
    if (!data) return null;
    const filtered = data.cables.features.filter(matchesFilters);
    return {
      ...data,
      cables: { ...data.cables, features: filtered },
    } as CableData;
  }, [data, matchesFilters]);

  useModuleCount("cables", filteredData?.cables.features.length ?? null);

  const { isInRegion, regionActive } = useRegion();
  const { inRegionSet, regionCount } = useMemo(() => {
    if (!filteredData || !regionActive) return { inRegionSet: new Set<string | number>(), regionCount: null };
    const set = new Set<string | number>();
    for (const f of filteredData.cables.features) {
      const coords = (f.geometry as GeoJSON.MultiLineString).coordinates;
      const firstLine = coords[0];
      const lastLine = coords[coords.length - 1];
      if (!firstLine?.length || !lastLine?.length) continue;
      const first = firstLine[0];
      const last = lastLine[lastLine.length - 1];
      if (isInRegion(first[0], first[1]) || isInRegion(last[0], last[1])) {
        set.add(f.properties.id);
      }
    }
    return { inRegionSet: set, regionCount: set.size };
  }, [filteredData, regionActive, isInRegion]);
  useRegionCount("cables", regionCount);

  return (
    <CableSelectionProvider>
      <CablesLayerInner data={filteredData} inRegionSet={inRegionSet} regionActive={regionActive} />
      <CableDetailCard />
    </CableSelectionProvider>
  );
}
