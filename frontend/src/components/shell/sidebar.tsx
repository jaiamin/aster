import { useCallback, useMemo, useState } from "react";
import { Layers, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { MODULE_REGISTRY, CATEGORY_ORDER } from "@/modules/registry";
import { useModuleToggle, useModuleCounts, useModuleFilter } from "@/modules/module-context";
import { TIME_PRESETS, type TimePreset } from "@/lib/time-filter";
import type { ModuleDefinition } from "@/types/modules";

function ModuleRow({
  def,
  enabled,
  count,
  onToggle,
}: {
  def: ModuleDefinition;
  enabled: boolean;
  count: number | null | undefined;
  onToggle: () => void;
}) {
  const { icon: Icon, name } = def;

  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-2 py-1.5 text-xs text-white/70 transition-colors hover:bg-panel-hover hover:text-white"
    >
      <Icon size={14} />
      {name}
      {count !== undefined && (
        <span className="text-[10px] tabular-nums text-muted/50">
          {count === null ? (
            <span className="inline-block h-2.5 w-6 translate-y-px animate-pulse rounded bg-muted/20" />
          ) : (
            count.toLocaleString()
          )}
        </span>
      )}
      <div
        className={`ml-auto h-3 w-3 border transition-colors ${
          enabled
            ? "border-accent bg-accent"
            : "border-muted/40 bg-transparent"
        }`}
      />
    </button>
  );
}

function CategoryGroup({
  category,
  modules,
  enabledModules,
  moduleCounts,
  open,
  onToggleOpen,
  onToggle,
}: {
  category: string;
  modules: ModuleDefinition[];
  enabledModules: Set<string>;
  moduleCounts: Map<string, number | null>;
  open: boolean;
  onToggleOpen: () => void;
  onToggle: (id: string) => void;
}) {
  const activeCount = modules.filter((m) => enabledModules.has(m.id)).length;

  return (
    <div>
      <button
        onClick={onToggleOpen}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-panel-hover"
      >
        <ChevronRight
          size={12}
          className={`shrink-0 text-white/50 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="font-medium text-white tracking-wide text-xs">
          {category}
        </span>
        {activeCount > 0 && (
          <span className="ml-auto tabular-nums text-white/50">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="relative ml-[17px] border-l border-panel-border pl-[7px] mb-1">
          {modules.map((def) => (
            <ModuleRow
              key={def.id}
              def={def}
              enabled={enabledModules.has(def.id)}
              count={moduleCounts.get(def.id)}
              onToggle={() => onToggle(def.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const PRESET_LABELS: Record<TimePreset, string> = {
  "1h": "1h", "6h": "6h", "24h": "24h", "3d": "3d", "7d": "7d", "30d": "30d", "all": "All",
};

function TimeFilterRow({ value, onChange }: { value: TimePreset; onChange: (p: TimePreset) => void }) {
  return (
    <div className="flex items-center px-3 py-2">
      {TIME_PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 py-0.5 text-[11px] font-medium transition-colors ${
            p === value
              ? "bg-accent text-white"
              : "text-white/50 hover:bg-panel-hover hover:text-white/80"
          }`}
        >
          {PRESET_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

export function Sidebar() {
  const [modulesOpen, setModulesOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const { enabledModules, toggle } = useModuleToggle();
  const { moduleCounts } = useModuleCounts();
  const { timeFilter, setTimeFilter } = useModuleFilter();

  const grouped = useMemo(() => {
    const map = new Map<string, ModuleDefinition[]>();
    for (const def of MODULE_REGISTRY) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => ({ category: c, modules: map.get(c)! }));
  }, []);

  const allExpanded = grouped.length > 0 && grouped.every((g) => openCategories.has(g.category));

  const toggleAll = useCallback(() => {
    setOpenCategories(allExpanded ? new Set() : new Set(grouped.map((g) => g.category)));
  }, [allExpanded, grouped]);

  const toggleCategory = useCallback((category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  return (
    <div className="relative flex h-full shrink-0">
      {/* Icon rail */}
      <div className="flex h-full w-12 flex-col items-center border-r border-panel-border bg-panel">
        <a href="/" className="flex h-12 w-full items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-white transition-transform duration-700 ease-in-out hover:rotate-[360deg]">
            {[0, 72, 144, 216, 288].map((angle) => (
              <rect
                key={angle}
                x="10"
                y="2"
                width="4"
                height="7"
                rx="0.5"
                fill="currentColor"
                transform={`rotate(${angle} 12 12)`}
              />
            ))}
          </svg>
        </a>

        <div className="h-px w-full bg-panel-border" />

        <button
          onClick={() => setModulesOpen(!modulesOpen)}
          aria-label="Toggle modules"
          className={`mt-2 flex h-9 w-9 items-center justify-center transition-all ${
            modulesOpen
              ? "bg-panel-hover text-foreground"
              : "text-muted hover:bg-panel-hover hover:text-foreground"
          }`}
        >
          <Layers size={16} />
        </button>
      </div>

      {/* Modules flyout */}
      {modulesOpen && (
        <>
          <div className="h-full w-72 border-r border-panel-border bg-panel">
            <div className="flex h-12 items-center gap-3 px-4 bg-accent">
              <Layers size={16} className="text-white" />
              <span className="text-[14px] font-medium text-white translate-y-px">
                Data Layers
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={toggleAll}
                  aria-label={allExpanded ? "Collapse all" : "Expand all"}
                  className="flex h-6 w-6 items-center justify-center text-white transition-colors hover:bg-white/10"
                >
                  <ChevronsUpDown size={14} />
                </button>
                <button
                  onClick={() => setModulesOpen(false)}
                  aria-label="Close modules"
                  className="flex h-6 w-6 items-center justify-center text-white transition-colors hover:bg-white/10"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
            <div className="h-px bg-panel-border" />
            <TimeFilterRow value={timeFilter} onChange={setTimeFilter} />
            <div className="h-px bg-panel-border" />
            <div className="p-2 space-y-0.5">
              {grouped.map(({ category, modules }) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  modules={modules}
                  enabledModules={enabledModules}
                  moduleCounts={moduleCounts}
                  open={openCategories.has(category)}
                  onToggleOpen={() => toggleCategory(category)}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>

          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-[-1]"
            onClick={() => setModulesOpen(false)}
          />
        </>
      )}
    </div>
  );
}
