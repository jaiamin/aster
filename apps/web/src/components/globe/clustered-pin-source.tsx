import { useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { registerLayerClick } from "@/lib/layer-click";
import { LngLatBounds, type GeoJSONSource } from "maplibre-gl";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

interface ClusteredPinSourceProps {
  moduleId: string;
  geojson: GeoJSON.FeatureCollection;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  regionActive?: boolean;
}

export function ClusteredPinSource({
  moduleId,
  geojson,
  clusterMaxZoom = 12,
  clusterRadius = 50,
  regionActive = false,
}: ClusteredPinSourceProps) {
  const { current: mapRef } = useMap();
  const pinsLayer = `${moduleId}-pins`;
  const clusterLayer = `${moduleId}-clusters`;
  const outPinsLayer = `${moduleId}-pins-out`;
  const outClusterLayer = `${moduleId}-clusters-out`;
  const pinImage = `${moduleId}-pin`;

  // Split data: main source gets in-region (or all when inactive), out source gets out-of-region
  const { mainFC, outFC } = useMemo(() => {
    if (!regionActive) return { mainFC: geojson, outFC: EMPTY_FC };
    const inFeatures: GeoJSON.Feature[] = [];
    const outFeatures: GeoJSON.Feature[] = [];
    for (const f of geojson.features) {
      if (f.properties?.inRegion) inFeatures.push(f);
      else outFeatures.push(f);
    }
    return {
      mainFC: { type: "FeatureCollection" as const, features: inFeatures },
      outFC: { type: "FeatureCollection" as const, features: outFeatures },
    };
  }, [geojson, regionActive]);

  // Cluster click — zoom to expand
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const handleCluster = (sourceId: string) => (feature: maplibregl.GeoJSONFeature) => {
      const clusterId = feature.properties?.cluster_id as number;
      const pointCount = feature.properties?.point_count as number;
      const source = map.getSource(sourceId) as GeoJSONSource;
      if (!source) return;
      source.getClusterLeaves(clusterId, pointCount, 0).then((leaves) => {
        if (leaves.length === 0) return;
        const bounds = new LngLatBounds();
        for (const leaf of leaves) {
          const [lng, lat] = (leaf.geometry as GeoJSON.Point).coordinates;
          bounds.extend([lng, lat]);
        }
        // If all points share the same coordinates, fitBounds won't zoom enough
        // to break the cluster. Zoom past clusterMaxZoom to force individual pins.
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const tooSmall = Math.abs(ne.lng - sw.lng) < 0.001 && Math.abs(ne.lat - sw.lat) < 0.001;
        if (tooSmall) {
          const center = bounds.getCenter();
          map.flyTo({ center, zoom: clusterMaxZoom + 1, duration: 500 });
        } else {
          map.fitBounds(bounds, { padding: 80, duration: 500 });
        }
      });
    };

    const cleanups = [
      registerLayerClick(clusterLayer, handleCluster(`${moduleId}-source`)),
      registerLayerClick(outClusterLayer, handleCluster(`${moduleId}-source-out`)),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [mapRef, moduleId, clusterLayer, outClusterLayer]);

  // Pointer cursor
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    const layers = [pinsLayer, clusterLayer, outPinsLayer, outClusterLayer];
    for (const id of layers) {
      map.on("mouseenter", id, onEnter);
      map.on("mouseleave", id, onLeave);
    }
    return () => {
      for (const id of layers) {
        map.off("mouseenter", id, onEnter);
        map.off("mouseleave", id, onLeave);
      }
    };
  }, [mapRef, pinsLayer, clusterLayer, outPinsLayer, outClusterLayer]);

  return (
    <>
      {/* Main source: all items when no region, in-region only when active */}
      <Source
        id={`${moduleId}-source`}
        type="geojson"
        data={mainFC}
        cluster={true}
        clusterRadius={clusterRadius}
        clusterMaxZoom={clusterMaxZoom}
      >
        <Layer
          id={pinsLayer}
          type="symbol"
          filter={["!", ["has", "point_count"]]}
          layout={{
            "icon-image": ["get", "pinImage"],
            "icon-size": 1,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
        />
        <Layer
          id={clusterLayer}
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "icon-image": pinImage,
            "icon-size": 1,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 10,
            "text-anchor": "center",
            "text-offset": [1.5, -3.5],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          }}
          paint={{
            "text-color": "#ffffff",
            "text-halo-color": "rgba(0, 0, 0, 0.65)",
            "text-halo-width": 5,
          }}
        />
      </Source>

      {/* Out-of-region source: empty when no region, out-of-region items when active */}
      <Source
        id={`${moduleId}-source-out`}
        type="geojson"
        data={outFC}
        cluster={true}
        clusterRadius={clusterRadius}
        clusterMaxZoom={clusterMaxZoom}
      >
        <Layer
          id={outPinsLayer}
          type="symbol"
          filter={["!", ["has", "point_count"]]}
          layout={{
            "icon-image": ["get", "pinImage"],
            "icon-size": 1,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          }}
          paint={{ "icon-opacity": 0.2 }}
        />
        <Layer
          id={outClusterLayer}
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "icon-image": pinImage,
            "icon-size": 1,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 10,
            "text-anchor": "center",
            "text-offset": [1.5, -3.5],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          }}
          paint={{
            "icon-opacity": 0.2,
            "text-color": "#ffffff",
            "text-halo-color": "rgba(0, 0, 0, 0.65)",
            "text-halo-width": 5,
            "text-opacity": 0.2,
          }}
        />
      </Source>
    </>
  );
}
