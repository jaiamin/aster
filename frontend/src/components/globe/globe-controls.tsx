import { useCallback } from "react";
import { Plus, Minus } from "lucide-react";
import type { MapViewState } from "@/types/map";
import { MIN_ZOOM } from "@/config/map";

interface GlobeControlsProps {
  viewState: MapViewState;
  onMove: (evt: { viewState: MapViewState }) => void;
}

function ControlButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded border border-panel-border bg-panel text-muted backdrop-blur-md transition-all hover:border-accent-dim hover:text-accent hover:shadow-[0_0_8px_var(--color-accent-dim)]"
    >
      {children}
    </button>
  );
}

export function GlobeControls({ viewState, onMove }: GlobeControlsProps) {
  const update = useCallback(
    (partial: Partial<MapViewState>) => {
      onMove({ viewState: { ...viewState, ...partial } });
    },
    [viewState, onMove]
  );

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
      <ControlButton
        label="Zoom in"
        onClick={() => update({ zoom: Math.min(viewState.zoom + 1, 22) })}
      >
        <Plus size={14} />
      </ControlButton>
      <ControlButton
        label="Zoom out"
        onClick={() => update({ zoom: Math.max(viewState.zoom - 1, MIN_ZOOM) })}
      >
        <Minus size={14} />
      </ControlButton>
    </div>
  );
}
