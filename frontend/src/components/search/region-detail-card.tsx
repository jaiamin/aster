import { MapPin, LocateFixed, X } from "lucide-react";
import { MODULE_REGISTRY } from "@/modules/registry";
import { useModuleToggle, useModuleCounts, useRegion } from "@/modules/module-context";

interface RegionDetailCardProps {
  name: string;
  onRecenter: () => void;
  onClose: () => void;
}

export function RegionDetailCard({ name, onRecenter, onClose }: RegionDetailCardProps) {
  const { enabledModules } = useModuleToggle();
  const { moduleCounts } = useModuleCounts();
  const { regionCounts } = useRegion();

  const color = "#3d7ab5";

  // Only show modules that are enabled and have a region count
  const rows = MODULE_REGISTRY.filter((m) => enabledModules.has(m.id)).map((m) => {
    const total = moduleCounts.get(m.id);
    const region = regionCounts.get(m.id);
    return { def: m, total, region };
  });

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className="relative">
          <div
            className="w-full h-[100px] flex flex-col items-center justify-center gap-1"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
          >
            <MapPin size={28} style={{ color }} />
            <span className="text-sm font-medium text-muted">
              Region
            </span>
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={onRecenter}
              className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = color)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              title="Recenter"
            >
              <LocateFixed size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Region name */}
          <button
            onClick={onRecenter}
            className="text-lg font-semibold transition-colors"
            style={{ color }}
          >
            {name}
          </button>

          {/* Data layer counts */}
          {rows.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-muted/60">
                Data in Region
              </div>
              <div className="space-y-0.5">
                {rows.map(({ def, total, region }) => {
                  const Icon = def.icon;
                  return (
                    <div key={def.id} className="flex items-center gap-2 text-sm">
                      <Icon size={13} className="shrink-0 text-muted/60" />
                      <span className="text-muted">{def.name}</span>
                      <span className="ml-auto font-mono text-foreground tabular-nums">
                        {region != null ? region.toLocaleString() : "—"}
                      </span>
                      {total != null && region != null && (
                        <span className="text-[10px] text-muted/40 tabular-nums">
                          / {total.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
