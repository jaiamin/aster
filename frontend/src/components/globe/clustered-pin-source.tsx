import { useEffect } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { registerLayerClick } from "@/lib/layer-click";
import { LngLatBounds, type GeoJSONSource } from "maplibre-gl";

interface ClusteredPinSourceProps {
  moduleId: string;
  geojson: GeoJSON.FeatureCollection;
  clusterMaxZoom?: number;
  clusterRadius?: number;
}

export function ClusteredPinSource({
  moduleId,
  geojson,
  clusterMaxZoom = 12,
  clusterRadius = 100,
}: ClusteredPinSourceProps) {
  const { current: mapRef } = useMap();
  const pinsLayer = `${moduleId}-pins`;
  const clusterLayer = `${moduleId}-clusters`;
  const pinImage = `${moduleId}-pin`;

  // Cluster click — zoom to expand
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(clusterLayer, (feature) => {
      const clusterId = feature.properties?.cluster_id as number;
      const pointCount = feature.properties?.point_count as number;
      const source = map.getSource(`${moduleId}-source`) as GeoJSONSource;
      source.getClusterLeaves(clusterId, pointCount, 0).then((leaves) => {
        const bounds = new LngLatBounds();
        for (const leaf of leaves) {
          const [lng, lat] = (leaf.geometry as GeoJSON.Point).coordinates;
          bounds.extend([lng, lat]);
        }
        map.fitBounds(bounds, { padding: 80, duration: 500 });
      });
    });
  }, [mapRef, moduleId, clusterLayer]);

  // Pointer cursor for both layers
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    for (const id of [pinsLayer, clusterLayer]) {
      map.on("mouseenter", id, onEnter);
      map.on("mouseleave", id, onLeave);
    }
    return () => {
      for (const id of [pinsLayer, clusterLayer]) {
        map.off("mouseenter", id, onEnter);
        map.off("mouseleave", id, onLeave);
      }
    };
  }, [mapRef, pinsLayer, clusterLayer]);

  return (
    <Source
      id={`${moduleId}-source`}
      type="geojson"
      data={geojson}
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
  );
}
