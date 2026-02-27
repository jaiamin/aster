import { MapPin } from "lucide-react";
import {
  DetailCard,
  CardBanner,
  CardSection,
  CardBody,
  ScrollText,
} from "@/components/detail-card/detail-card";
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

  const rows = MODULE_REGISTRY.filter((m) => enabledModules.has(m.id)).map((m) => {
    const total = moduleCounts.get(m.id);
    const region = regionCounts.get(m.id);
    return { def: m, total, region };
  });

  return (
    <DetailCard onClose={onClose}>
      <CardBanner onClose={onClose} onRecenter={onRecenter} accentColor={color}>
        <div className="flex items-center justify-center h-full bg-surface">
          <MapPin size={48} strokeWidth={1.5} className="text-white" />
        </div>
      </CardBanner>
      <CardBody>
        <div className="flex items-center gap-2">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              backgroundColor: color,
              border: "1px solid rgba(255,255,255,0.8)",
            }}
          >
            <MapPin size={13} className="text-white" />
          </div>
          <button
            onClick={onRecenter}
            className="min-w-0 flex-1 transition-colors hover:text-white/80"
          >
            <ScrollText text={name} className="text-sm font-semibold text-white" />
          </button>
        </div>
        {rows.length > 0 && (
          <CardSection title="Data in Region">
            <div className="space-y-0.5">
              {rows.map(({ def, total, region }) => {
                const Icon = def.icon;
                return (
                  <div key={def.id} className="flex items-center gap-2 text-xs">
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
          </CardSection>
        )}
      </CardBody>
    </DetailCard>
  );
}
