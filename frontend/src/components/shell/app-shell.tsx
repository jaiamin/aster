import { useState } from "react";
import { GlobeMap } from "@/components/globe/globe-map";
import { GlobeControls } from "@/components/globe/globe-controls";
import { Sidebar } from "@/components/shell/sidebar";
import { StatusBar } from "@/components/shell/status-bar";
import { useMapState } from "@/hooks/use-map-state";
import { useModules } from "@/modules/module-context";
import { MODULE_REGISTRY } from "@/modules/registry";
import type { MapStyleMode } from "@/config/map";

export function AppShell() {
  const { viewState, status, onMove } = useMapState();
  const [styleMode, setStyleMode] = useState<MapStyleMode>("dark");
  const { enabledModules } = useModules();

  const activeLayers = MODULE_REGISTRY.filter((m) => enabledModules.has(m.id));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex-1">
        <GlobeMap viewState={viewState} onMove={onMove} styleMode={styleMode}>
          {activeLayers.map((m) => (
            <m.MapLayer key={m.id} />
          ))}
        </GlobeMap>
        <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
          <GlobeControls
            viewState={viewState}
            onMove={onMove}
            styleMode={styleMode}
            onStyleChange={setStyleMode}
          />
          <StatusBar status={status} />
        </div>
      </div>
    </div>
  );
}
