import { GlobeMap } from "@/components/globe/globe-map";
import { Sidebar } from "@/components/shell/sidebar";
import { StatusBar } from "@/components/shell/status-bar";
import { useMapState } from "@/hooks/use-map-state";

export function AppShell() {
  const { viewState, status, onMove } = useMapState();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <GlobeMap viewState={viewState} onMove={onMove} />
      <StatusBar status={status} />
      <Sidebar />
    </div>
  );
}
