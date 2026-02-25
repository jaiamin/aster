import { Cable, X } from "lucide-react";
import { useCableSelection } from "./cable-context";

export function CableDetailCard() {
  const { selected, deselect } = useCableSelection();

  if (!selected) return null;

  const { cable } = selected;
  const color = cable.properties.color || "#939597";

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <div
            className="w-full h-[100px] flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <Cable size={36} strokeWidth={1.5} style={{ color }} />
            <span className="text-xs font-medium text-muted">Submarine Cable</span>
          </div>
          <div className="absolute top-2 right-2">
            <button
              onClick={deselect}
              className="p-1 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <span className="text-lg font-semibold" style={{ color }}>
              {cable.properties.name}
            </span>
          </div>

          {/* Source */}
          <div className="flex items-center justify-between pt-1 border-t border-panel-border">
            <span className="text-[11px] text-muted/50">
              TeleGeography
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
