import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { Zap } from "lucide-react";
import { usePowerPlants } from "./use-power-plants";
import { PowerPlantSelectionProvider, usePowerPlantSelection } from "./power-plant-context";
import { useModuleCount } from "@/hooks/use-module-count";
import { PowerPlantDetailCard } from "./power-plant-detail-card";
import { registerModulePins, unregisterModulePins } from "@/lib/pin-icon";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { registerLayerClick } from "@/lib/layer-click";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import type { PowerPlant } from "@/types/power-plants";

const MODULE_ID = "power-plants";

const STATUS_VARIANTS = [
  { key: "coal", dotColor: "#6b7280" },
  { key: "gas", dotColor: "#f59e0b" },
  { key: "oil", dotColor: "#78716c" },
  { key: "hydro", dotColor: "#3b82f6" },
  { key: "solar", dotColor: "#eab308" },
  { key: "wind", dotColor: "#06b6d4" },
  { key: "nuclear", dotColor: "#a855f7" },
  { key: "geothermal", dotColor: "#ef4444" },
  { key: "biomass", dotColor: "#22c55e" },
  { key: "waste", dotColor: "#a3a3a3" },
  { key: "other", dotColor: "#6b7280" },
];

function fuelToStatusKey(fuel: string): string {
  const key = fuel.toLowerCase();
  if (STATUS_VARIANTS.some((v) => v.key === key)) return key;
  return "other";
}

function toGeoJSON(plants: PowerPlant[], selectedId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: plants.map((p) => {
      const key = fuelToStatusKey(p.fuelType);
      const sel = p.id === selectedId;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          pinImage: sel ? `${MODULE_ID}-pin-${key}-selected` : `${MODULE_ID}-pin-${key}`,
        },
      };
    }),
  };
}

function PowerPlantsLayerInner({ plants }: { plants: PowerPlant[] }) {
  const { current: mapRef } = useMap();
  const { selected, select, deselect } = usePowerPlantSelection();
  const plantsRef = useRef(plants);
  plantsRef.current = plants;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [ready, setReady] = useState(false);

  const selectedId = selected?.plant.id ?? null;
  const geojson = useMemo(() => toGeoJSON(plants, selectedId), [plants, selectedId]);

  // Register pin images
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const config = {
      moduleId: MODULE_ID,
      icon: Zap,
      bgColor: CATEGORY_COLORS.Infrastructure,
      statusVariants: STATUS_VARIANTS,
    };
    registerModulePins(map, config).then(() => setReady(true));
    return () => { unregisterModulePins(map, config); };
  }, [mapRef]);

  // Click handler
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    return registerLayerClick(`${MODULE_ID}-pins`, (feature) => {
      const id = feature.properties?.id;
      const plant = plantsRef.current.find((p) => p.id === id);
      if (plant) {
        select(plant);
        map.flyTo({
          center: [plant.longitude, plant.latitude],
          zoom: FOCUS_ZOOM["power-plants"],
          duration: 1500,
        });
      }
    });
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

  // Pointer cursor
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.on("mouseenter", `${MODULE_ID}-pins`, onEnter);
    map.on("mouseleave", `${MODULE_ID}-pins`, onLeave);
    return () => {
      map.off("mouseenter", `${MODULE_ID}-pins`, onEnter);
      map.off("mouseleave", `${MODULE_ID}-pins`, onLeave);
    };
  }, [mapRef]);

  if (!ready) return null;

  return (
    <Source id={`${MODULE_ID}-source`} type="geojson" data={geojson}>
      <Layer
        id={`${MODULE_ID}-pins`}
        type="symbol"
        layout={{
          "icon-image": ["get", "pinImage"],
          "icon-size": 1,
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
      />
    </Source>
  );
}

export function PowerPlantsLayer() {
  const plants = usePowerPlants();
  useModuleCount("power-plants", plants?.length ?? null);
  return (
    <PowerPlantSelectionProvider>
      <PowerPlantsLayerInner plants={plants ?? []} />
      <PowerPlantDetailCard />
    </PowerPlantSelectionProvider>
  );
}
