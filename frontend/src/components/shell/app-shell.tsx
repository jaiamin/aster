import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { GlobeMap } from "@/components/globe/globe-map";
import { GlobeControls } from "@/components/globe/globe-controls";
import { UserLocationDot } from "@/components/globe/user-location-dot";
import { Sidebar } from "@/components/shell/sidebar";
import { StatusBar } from "@/components/shell/status-bar";
import { useMapState } from "@/hooks/use-map-state";
import { useModuleToggle, useModuleFilter } from "@/modules/module-context";
import { MODULE_REGISTRY } from "@/modules/registry";
import { GeoSearch } from "@/components/search/geo-search";
import { getInitialStyle } from "@/lib/url-state";
import type { MapStyleMode } from "@/config/map";

export function AppShell() {
  const { viewState, status, onMove, syncUrl } = useMapState();
  const [styleMode, setStyleMode] = useState<MapStyleMode>(getInitialStyle);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { enabledModules } = useModuleToggle();
  const { searchQuery, timeFilter } = useModuleFilter();

  useEffect(() => {
    syncUrl(viewState, enabledModules, styleMode, searchQuery, timeFilter);
  }, [viewState, enabledModules, styleMode, searchQuery, timeFilter, syncUrl]);

  const activeLayers = MODULE_REGISTRY.filter((m) => enabledModules.has(m.id));

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    mapInstanceRef.current = map;
    setMapReady(true);
  }, []);

  const handleLocate = useCallback((coords: { lng: number; lat: number }) => {
    setUserLocation(coords);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex-1">
        <GlobeMap viewState={viewState} onMove={onMove} styleMode={styleMode} onMapReady={handleMapReady}>
          {activeLayers.map((m) => (
            <Suspense key={m.id} fallback={null}>
              <m.MapLayer />
            </Suspense>
          ))}
          <GeoSearch />
          <UserLocationDot location={userLocation} />
        </GlobeMap>
        <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
          <GlobeControls
            viewState={viewState}
            onMove={onMove}
            styleMode={styleMode}
            onStyleChange={setStyleMode}
            onLocate={handleLocate}
            hasLocation={userLocation !== null}
            map={mapReady ? mapInstanceRef.current : null}
          />
          <StatusBar status={status} />
        </div>
      </div>
    </div>
  );
}
