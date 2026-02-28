import { useCallback, useMemo, useState } from "react";
import { Layers, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, EyeOff, Search, Filter } from "lucide-react";
import { MODULE_REGISTRY, CATEGORY_ORDER } from "@/modules/registry";
import { useModuleToggle, useModuleCounts } from "@/modules/module-context";
import { useExplorer } from "@/modules/explorer-context";
import { ExplorerPanel } from "@/components/shell/explorer-panel";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import type { ModuleDefinition, FilterField } from "@/types/modules";
import type { ActiveFilters, FilterValue } from "@/modules/explorer-context";

function describeFilter(field: FilterField, value: FilterValue): React.ReactNode[] {
  const k = field.key;
  switch (value.type) {
    case "enum": {
      const lm = field.type === "enum" ? field.labelMap : undefined;
      const labels = Array.from(value.selected).map((v) => lm?.[v] ?? v);
      return [
        <b key={`${k}-l`}>{field.label}</b>,
        <span key={`${k}-o`}>{labels.length === 1 ? "is" : "is one of"}</span>,
        ...labels.map((l) => (
          <span key={`${k}-${l}`} className="whitespace-nowrap rounded bg-accent/15 px-1 py-px text-accent">{l}</span>
        )),
      ];
    }
    case "range": {
      const unit = field.type === "range" ? (field.unit ?? "") : "";
      return [
        <b key={`${k}-l`}>{field.label}</b>,
        <span key={`${k}-o`}>between</span>,
        <span key={`${k}-v`} className="whitespace-nowrap rounded bg-accent/15 px-1 py-px text-accent">{value.min}{unit} — {value.max}{unit}</span>,
      ];
    }
    case "boolean":
      return [
        <b key={`${k}-l`}>{field.label}</b>,
        <span key={`${k}-o`}>is</span>,
        <span key={`${k}-v`} className="whitespace-nowrap rounded bg-accent/15 px-1 py-px text-accent">{value.value ? "Yes" : "No"}</span>,
      ];
    case "text":
      return [
        <b key={`${k}-l`}>{field.label}</b>,
        <span key={`${k}-o`}>contains</span>,
        <span key={`${k}-v`} className="whitespace-nowrap rounded bg-accent/15 px-1 py-px text-accent">{value.value}</span>,
      ];
  }
}

function ModuleRow({
  def,
  enabled,
  count,
  onToggle,
  onExplore,
  isExploring,
  hasActiveFilters,
  activeFilters,
  totalCount,
}: {
  def: ModuleDefinition;
  enabled: boolean;
  count: number | null | undefined;
  onToggle: () => void;
  onExplore: () => void;
  isExploring: boolean;
  hasActiveFilters: boolean;
  activeFilters: ActiveFilters;
  totalCount: number;
}) {
  const { icon: Icon, name, category, filters: filterFields } = def;
  const color = CATEGORY_COLORS[category] ?? "#8892b0";
  const EyeIcon = enabled ? Eye : EyeOff;

  const filterItems = useMemo(() => {
    if (!hasActiveFilters || !filterFields) return null;
    const fieldMap = new Map(filterFields.map((f) => [f.key, f]));
    const items: React.ReactNode[] = [];
    let filterIndex = 0;
    for (const [key, value] of Object.entries(activeFilters)) {
      const field = fieldMap.get(key);
      if (!field) continue;
      if (filterIndex > 0) items.push(<span key={`sep-${key}`}>,</span>);
      for (const node of describeFilter(field, value)) {
        items.push(node);
      }
      filterIndex++;
    }
    return items.length > 0 ? items : null;
  }, [hasActiveFilters, filterFields, activeFilters]);

  const filteredCount = typeof count === "number" ? count : 0;

  return (
    <div
      className={`flex w-full flex-col text-xs transition-colors ${
        isExploring ? "text-white" : "text-white/70"
      }`}
    >
      <div className="flex items-center">
        <div className="flex flex-1 items-center gap-3 px-2 py-1.5 min-w-0">
          <div
            className={`flex shrink-0 items-center justify-center transition-opacity ${enabled ? "" : "opacity-40"}`}
            style={{
              width: 22,
              height: 22,
              backgroundColor: color,
              border: "1px solid rgba(255,255,255,0.8)",
            }}
          >
            <Icon size={12} className="text-white" />
          </div>
          <span className={`text-[13px] truncate transition-opacity ${enabled ? "" : "opacity-40"}`}>
            {name}
            {count !== undefined && (
              count === null ? (
                <span className="ml-1 inline-block h-2.5 w-6 translate-y-px animate-pulse rounded bg-muted/20" />
              ) : (
                <span className="tabular-nums"> ({count.toLocaleString()})</span>
              )
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 pr-1">
          <button
            onClick={onToggle}
            aria-label={enabled ? "Hide layer" : "Show layer"}
            className={`flex h-6 w-6 items-center justify-center transition-colors ${
              enabled
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-muted/40 hover:bg-white/10 hover:text-white/60"
            }`}
          >
            <EyeIcon size={16} />
          </button>
          <button
            onClick={onExplore}
            aria-label="Explore layer"
            className={`flex h-6 w-6 items-center justify-center transition-colors ${
              isExploring
                ? "bg-accent/20 text-accent hover:bg-accent/30"
                : "text-muted/40 hover:bg-white/10 hover:text-white/60"
            }`}
          >
            <Search size={15} />
          </button>
        </div>
      </div>
      {filterItems && (
        <div className="mb-1.5 ml-2 mr-1 flex items-start gap-1.5 rounded bg-accent/10 py-1.5 pl-1.5 pr-2">
          <Filter size={14} className="mt-0.5 shrink-0 text-accent fill-accent" />
          <div className="flex flex-1 min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1 text-[11px] text-white/60 [&_b]:font-semibold [&_b]:text-white/80">
            <span>Viewing</span>
            <b>{filteredCount.toLocaleString()}</b>
            <span>of</span>
            <b>{totalCount.toLocaleString()}</b>
            <b>{name}</b>
            <span>where</span>
            {filterItems}
          </div>
        </div>
      )}
    </div>
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
  onExplore,
  explorerModuleId,
  hasActiveFilters,
  getFilters,
  moduleData,
}: {
  category: string;
  modules: ModuleDefinition[];
  enabledModules: Set<string>;
  moduleCounts: Map<string, number | null>;
  open: boolean;
  onToggleOpen: () => void;
  onToggle: (id: string) => void;
  onExplore: (moduleId: string) => void;
  explorerModuleId: string | null;
  hasActiveFilters: (moduleId: string) => boolean;
  getFilters: (moduleId: string) => ActiveFilters;
  moduleData: Map<string, unknown[]>;
}) {
  const activeCount = modules.filter((m) => enabledModules.has(m.id)).length;

  return (
    <div>
      <button
        onClick={onToggleOpen}
        className="flex w-full items-center gap-2 pl-0.5 pr-1.5 py-2 text-xs transition-colors"
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
        <div className="relative ml-[7px] border-l border-panel-border pl-[7px] mb-1">
          {modules.map((def) => (
            <ModuleRow
              key={def.id}
              def={def}
              enabled={enabledModules.has(def.id)}
              count={moduleCounts.get(def.id)}
              onToggle={() => onToggle(def.id)}
              onExplore={() => onExplore(def.id)}
              isExploring={explorerModuleId === def.id}
              hasActiveFilters={hasActiveFilters(def.id)}
              activeFilters={getFilters(def.id)}
              totalCount={moduleData.get(def.id)?.length ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [modulesOpen, setModulesOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const { enabledModules, toggle } = useModuleToggle();
  const { moduleCounts } = useModuleCounts();
  const { openModuleId, openExplorer, closeExplorer, clearFilters, hasActiveFilters, getFilters, moduleData } = useExplorer();

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

  const handleToggle = useCallback((id: string) => {
    const willDisable = enabledModules.has(id);
    toggle(id);
    if (willDisable) {
      clearFilters(id);
      if (openModuleId === id) closeExplorer();
    }
  }, [enabledModules, toggle, clearFilters, openModuleId, closeExplorer]);

  const handleExplore = useCallback((moduleId: string) => {
    if (openModuleId === moduleId) closeExplorer();
    else openExplorer(moduleId);
  }, [openModuleId, closeExplorer, openExplorer]);

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
            <div className="flex h-12 items-center gap-2 pl-4 pr-2 bg-accent">
              <Layers size={16} className="text-white" />
              <span className="text-[14px] font-medium text-white translate-y-px">
                Data Layers
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={toggleAll}
                  aria-label={allExpanded ? "Collapse all" : "Expand all"}
                  className="flex h-6 w-6 items-center justify-center text-white/70 transition-colors hover:text-white"
                >
                  <ChevronsUpDown size={14} />
                </button>
                <button
                  onClick={() => setModulesOpen(false)}
                  aria-label="Close modules"
                  className="flex h-6 w-6 items-center justify-center text-white/70 transition-colors hover:text-white"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
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
                  onToggle={handleToggle}
                  onExplore={handleExplore}
                  explorerModuleId={openModuleId}
                  hasActiveFilters={hasActiveFilters}
                  getFilters={getFilters}
                  moduleData={moduleData}
                />
              ))}
            </div>
          </div>

          {openModuleId && <ExplorerPanel />}

          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-[-1]"
            onClick={() => setModulesOpen(false)}
          />
        </>
      )}

      {!modulesOpen && openModuleId && <ExplorerPanel />}
    </div>
  );
}
