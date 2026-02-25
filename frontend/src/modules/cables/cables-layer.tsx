import { useEffect, useMemo, useRef } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useCables } from "./use-cables";
import { CableSelectionProvider, useCableSelection } from "./cable-context";
import { CableDetailCard } from "./cable-detail-card";
import type { CableData, CableFeature } from "@/types/cables";

const FOCUS_ZOOM = 4;

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function buildCablesGeoJSON(data: CableData | null, selectedId: string | null): GeoJSON.FeatureCollection {
  if (!data) return EMPTY_FC;
  const features = data.cables.features.map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      selected: f.properties.id === selectedId,
    },
  }));
  return { type: "FeatureCollection", features };
}

function CablesLayerInner({ data }: { data: CableData | null }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = useCableSelection();
  const dataRef = useRef(data);
  dataRef.current = data;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const selectedId = selected?.cable.properties.id ?? null;
  const cablesGeojson = useMemo(() => buildCablesGeoJSON(data, selectedId), [data, selectedId]);
  const landingPoints = data?.landingPoints ?? EMPTY_FC;

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const consumed = (e.originalEvent as any)._layerHandled;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["cables-line", "cables-line-selected"],
      });

      if (features.length > 0 && !consumed) {
        (e.originalEvent as any)._layerHandled = true;
        const id = features[0].properties?.id;
        const d = dataRef.current;
        if (d) {
          const cable = d.cables.features.find(
            (f) => f.properties.id === id
          ) as CableFeature | undefined;
          if (cable) {
            select(cable);
          }
        }
      } else if (selectedRef.current && !consumed) {
        deselect();
      }
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapRef, select, deselect]);

  // Pointer cursor on hover
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };

    map.on("mouseenter", "cables-line", onEnter);
    map.on("mouseleave", "cables-line", onLeave);
    return () => {
      map.off("mouseenter", "cables-line", onEnter);
      map.off("mouseleave", "cables-line", onLeave);
    };
  }, [mapRef]);

  return (
    <>
      <Source id="cables-source" type="geojson" data={cablesGeojson}>
        {/* Cable lines — unselected */}
        <Layer
          id="cables-line"
          type="line"
          filter={["!", ["get", "selected"]]}
          paint={{
            "line-color": ["get", "color"],
            "line-opacity": 0.4,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              1, 0.5,
              4, 1,
              8, 2,
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
              1, 2,
              4, 3,
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
              1, 6,
              4, 10,
              8, 16,
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
  return (
    <CableSelectionProvider>
      <CablesLayerInner data={data} />
      <CableDetailCard />
    </CableSelectionProvider>
  );
}
