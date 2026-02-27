import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronUp, ChevronDown, X, Filter, Search, ExternalLink } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useExplorer, useExplorerFilters, type FilterValue } from "@/modules/explorer-context";
import { useModuleToggle } from "@/modules/module-context";
import { MODULE_REGISTRY } from "@/modules/registry";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import type { FilterField } from "@/types/modules";

export function ExplorerPanel() {
  const {
    openModuleId,
    closeExplorer,
    getFilters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    getSearch,
    setSearch,
    moduleData,
    selectItem,
  } = useExplorer();

  const { enabledModules, toggle } = useModuleToggle();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const def = useMemo(
    () => MODULE_REGISTRY.find((m) => m.id === openModuleId) ?? null,
    [openModuleId],
  );

  const filterPredicate = useExplorerFilters(openModuleId ?? "");

  // Reset sort and selection when module changes
  useEffect(() => {
    setSort(null);
    setSelectedIndex(null);
    setFiltersOpen(false);
  }, [openModuleId]);

  // Auto-enable layer when panel opens
  useEffect(() => {
    if (openModuleId && !enabledModules.has(openModuleId)) {
      toggle(openModuleId);
    }
  }, [openModuleId, enabledModules, toggle]);

  // Close on Escape
  useEffect(() => {
    if (!openModuleId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExplorer();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openModuleId, closeExplorer]);

  const moduleId = openModuleId ?? "";
  const search = getSearch(moduleId);
  const activeFilters = getFilters(moduleId);
  const rawData = moduleData.get(moduleId) ?? [];

  // Filter + search
  const filteredItems = useMemo(() => {
    const nameKey = def?.nameKey;
    const q = search.toLowerCase();
    return rawData.filter((item) => {
      const rec = item as Record<string, unknown>;
      if (!filterPredicate(rec)) return false;
      if (q && nameKey) {
        const name = String(rec[nameKey] ?? "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [rawData, filterPredicate, search, def?.nameKey]);

  // Sort filtered items
  const sortedItems = useMemo(() => {
    if (!sort) return filteredItems;
    const { key, dir } = sort;
    return [...filteredItems].sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return dir === "asc" ? av - bv : bv - av;
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filteredItems, sort]);

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        if (prev.dir === "asc") return { key, dir: "desc" };
        return null; // third click clears
      }
      return { key, dir: "asc" };
    });
    setSelectedIndex(null);
  }, []);

  // Select item — each layer's useModuleSelect handler handles flyTo + zoom
  const handleRowClick = useCallback(
    (item: unknown, index: number) => {
      setSelectedIndex(index);
      if (moduleId) selectItem(moduleId, item);
    },
    [moduleId, selectItem],
  );

  if (!openModuleId || !def) return null;

  const color = CATEGORY_COLORS[def.category] ?? "#8892b0";
  const Icon = def.icon;
  const filtersActive = hasActiveFilters(moduleId);

  return (
    <div className="flex h-full w-[420px] flex-col border-r border-panel-border bg-panel">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 px-3 bg-accent">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 22,
            height: 22,
            backgroundColor: color,
            border: "1px solid rgba(255,255,255,0.8)",
          }}
        >
          <Icon size={12} className="text-white" />
        </div>
        <span className="text-[14px] font-medium text-white translate-y-px">
          {def.name}
          <span className="tabular-nums">
            {filteredItems.length !== rawData.length
              ? ` (${filteredItems.length.toLocaleString()} / ${rawData.length.toLocaleString()})`
              : ` (${rawData.length.toLocaleString()})`}
          </span>
        </span>
        <button
          onClick={closeExplorer}
          aria-label="Close explorer"
          className="ml-auto flex h-6 w-6 items-center justify-center text-white transition-colors hover:bg-white/10"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Active filter summaries */}
      {filtersActive && (
        <div className="shrink-0 border-b border-panel-border px-3 py-2 space-y-1.5">
          {(def.filters ?? []).map((field) => {
            const val = activeFilters[field.key];
            if (!val) return null;
            return (
              <ActiveFilterRow
                key={field.key}
                field={field}
                value={val}
                onRemove={() => {
                  const next = { ...activeFilters };
                  delete next[field.key];
                  clearFilters(moduleId);
                  for (const [k, v] of Object.entries(next)) {
                    setFilter(moduleId, k, v);
                  }
                }}
              />
            );
          })}
          <button
            onClick={() => clearFilters(moduleId)}
            className="flex w-full items-center justify-center gap-2 pt-2 pb-1.5 text-[12px] font-medium text-accent hover:text-accent/80 transition-colors"
          >
            <Filter size={13} fill="currentColor" />
            Remove All Filters
          </button>
        </div>
      )}

      {/* Filter controls */}
      {filtersOpen && def.filters && def.filters.length > 0 && (
        <div className="shrink-0 space-y-3 border-b border-panel-border px-3 pt-2 pb-3">
          {def.filters.map((field) => (
            <FilterControl
              key={field.key}
              field={field}
              value={activeFilters[field.key]}
              data={rawData}
              onChange={(val) => setFilter(moduleId, field.key, val)}
              onClear={() => {
                const next = { ...activeFilters };
                delete next[field.key];
                clearFilters(moduleId);
                for (const [k, v] of Object.entries(next)) {
                  setFilter(moduleId, k, v);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Search bar + filter toggle */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        <div className="flex h-7 flex-1 items-center gap-2 bg-panel-hover px-2">
          <Search size={12} className="shrink-0 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(moduleId, e.target.value)}
            placeholder={`Search by ${def.nameKey ?? "name"}...`}
            className="w-full bg-transparent text-[11px] text-foreground placeholder:text-muted/50 outline-none"
          />
        </div>
        {def.filters && def.filters.length > 0 && (
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-label="Toggle filters"
            className={`relative flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${
              filtersOpen
                ? "bg-panel-hover text-foreground"
                : "text-muted hover:bg-panel-hover hover:text-foreground"
            }`}
          >
            <Filter size={13} fill="currentColor" />
            {filtersActive && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 min-h-0 flex flex-col">
        {def.listColumns && def.listColumns.length > 0 && (
          <div className="flex shrink-0 items-center border-b border-panel-border px-3 py-1.5">
            {def.listColumns.map((col) => (
              <button
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted/60 hover:text-muted transition-colors ${col.align === "right" ? "justify-end" : ""}`}
                style={{ width: col.width ?? undefined, flex: col.width ? undefined : 1 }}
              >
                {col.label}
                {sort?.key === col.key && (
                  sort.dir === "asc"
                    ? <ChevronUp size={10} className="shrink-0" />
                    : <ChevronDown size={10} className="shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {sortedItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-[11px] text-muted/60">No items match current filters</span>
          </div>
        ) : (
          <VirtualizedList
            items={sortedItems}
            columns={def.listColumns ?? []}
            selectedIndex={selectedIndex}
            onRowClick={handleRowClick}
          />
        )}
      </div>

      {/* Source footer */}
      {def.source && (
        <div className="shrink-0 flex items-center justify-between border-t border-muted/20 px-3 py-2">
          <span className="text-[11px] font-medium text-muted/50">Source</span>
          {def.source.url ? (
            <a
              href={def.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-foreground transition-colors"
            >
              {def.source.name} <ExternalLink size={10} />
            </a>
          ) : (
            <span className="text-[11px] text-muted/50">{def.source.name}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Virtualized List ──────────────────────────────────────────────────────────

function VirtualizedList({
  items,
  columns,
  selectedIndex,
  onRowClick,
}: {
  items: unknown[];
  columns: { key: string; label: string; width?: string; align?: "left" | "right"; labelMap?: Record<string, string> }[];
  selectedIndex: number | null;
  onRowClick: (item: unknown, index: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const item = items[vRow.index] as Record<string, unknown>;
          const isSelected = vRow.index === selectedIndex;
          return (
            <button
              key={vRow.key}
              onClick={() => onRowClick(item, vRow.index)}
              className={`absolute left-0 flex w-full items-center px-3 text-[11px] transition-colors ${
                isSelected
                  ? "bg-accent/15 text-white"
                  : "text-white/70 hover:bg-panel-hover hover:text-white"
              }`}
              style={{
                height: `${vRow.size}px`,
                top: `${vRow.start}px`,
              }}
            >
              {columns.map((col) => {
                const val = item[col.key];
                const raw =
                  val === null || val === undefined
                    ? "\u2014"
                    : typeof val === "number"
                      ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : String(val);
                const display = col.labelMap?.[String(val)] ?? raw;
                return (
                  <span
                    key={col.key}
                    className={`truncate tabular-nums ${col.align === "right" ? "text-right" : "text-left"}`}
                    style={{
                      width: col.width ?? undefined,
                      flex: col.width ? undefined : 1,
                    }}
                  >
                    {display}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Filter Control ────────────────────────────────────────────────────────────

function FilterControl({
  field,
  value,
  data,
  onChange,
  onClear,
}: {
  field: FilterField;
  value: FilterValue | undefined;
  data: unknown[];
  onChange: (val: FilterValue) => void;
  onClear: () => void;
}) {
  const isActive = value !== undefined;
  switch (field.type) {
    case "range":
      return <RangeFilter field={field} value={value} onChange={onChange} isActive={isActive} onClear={onClear} />;
    case "enum":
      return <EnumFilter field={field} value={value} data={data} onChange={onChange} isActive={isActive} onClear={onClear} />;
    case "boolean":
      return <BooleanFilter field={field} value={value} onChange={onChange} isActive={isActive} onClear={onClear} />;
    default:
      return null;
  }
}

function RangeFilter({
  field,
  value,
  onChange,
  isActive,
  onClear,
}: {
  field: Extract<FilterField, { type: "range" }>;
  value: FilterValue | undefined;
  onChange: (val: FilterValue) => void;
  isActive: boolean;
  onClear: () => void;
}) {
  const min = value?.type === "range" ? value.min : field.min;
  const max = value?.type === "range" ? value.max : field.max;
  const unit = field.unit ?? "";
  const step = (field.max - field.min) <= 10 ? 0.1 : 1;
  const range = field.max - field.min;
  const minPct = ((min - field.min) / range) * 100;
  const maxPct = ((max - field.min) / range) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] font-semibold text-white">{field.label}</label>
        <span className="text-[10px] tabular-nums text-white/50">
          {min}{unit} — {max}{unit}
        </span>
      </div>
      <div className="relative mt-2 h-4">
        {/* Track background */}
        <div className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full bg-panel-border" />
        {/* Active range fill */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-accent"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        {/* Min thumb input */}
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={step}
          value={min}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ type: "range", min: Math.min(v, max), max });
          }}
          className="range-thumb absolute inset-0 w-full cursor-pointer appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.3)] [&::-webkit-slider-thumb]:cursor-ew-resize"
          style={{ zIndex: min > field.min + range * 0.9 ? 4 : 3 }}
        />
        {/* Max thumb input */}
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={step}
          value={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ type: "range", min, max: Math.max(v, min) });
          }}
          className="range-thumb absolute inset-0 w-full cursor-pointer appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.3)] [&::-webkit-slider-thumb]:cursor-ew-resize"
          style={{ zIndex: 3 }}
        />
      </div>
    </div>
  );
}

function EnumFilter({
  field,
  value,
  data,
  onChange,
  isActive,
  onClear,
}: {
  field: Extract<FilterField, { type: "enum" }>;
  value: FilterValue | undefined;
  data: unknown[];
  onChange: (val: FilterValue) => void;
  isActive: boolean;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = value?.type === "enum" ? value.selected : new Set<string>();
  const hasSelection = selected.size > 0;

  // Derive options from data if not explicitly provided
  const options = useMemo(() => {
    if (field.options && field.options.length > 0) return field.options;
    const unique = new Set<string>();
    for (const item of data) {
      const val = (item as Record<string, unknown>)[field.key];
      if (val !== null && val !== undefined && val !== "") {
        unique.add(String(val));
      }
    }
    return Array.from(unique).sort();
  }, [field.options, field.key, data]);

  const visible = expanded ? options : options.slice(0, 8);
  const remaining = options.length - 8;

  const toggleOption = (opt: string) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange({ type: "enum", selected: next });
  };

  return (
    <div>
      <label className="text-[11px] font-semibold text-white">{field.label}</label>
      <div className="mt-1 flex flex-wrap gap-1">
        {visible.map((opt) => (
          <button
            key={opt}
            onClick={() => toggleOption(opt)}
            className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
              selected.has(opt)
                ? "bg-accent text-white"
                : "bg-panel-border text-white/60 hover:text-white/80"
            }`}
          >
            {field.labelMap?.[opt] ?? opt}
          </button>
        ))}
        {remaining > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="rounded px-2 py-0.5 text-[10px] text-muted hover:text-white/60"
          >
            +{remaining} more
          </button>
        )}
      </div>
    </div>
  );
}

function BooleanFilter({
  field,
  value,
  onChange,
  isActive,
  onClear,
}: {
  field: Extract<FilterField, { type: "boolean" }>;
  value: FilterValue | undefined;
  onChange: (val: FilterValue) => void;
  isActive: boolean;
  onClear: () => void;
}) {
  const checked = value?.type === "boolean" ? value.value : false;

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange({ type: "boolean", value: e.target.checked })}
          className="h-3 w-3 rounded border-muted/40 bg-transparent accent-accent"
        />
        <span className="text-[11px] font-semibold text-white">{field.label}</span>
      </label>
    </div>
  );
}

// ── Active Filter Summary Row ────────────────────────────────────────────────

function ActiveFilterRow({
  field,
  value,
  onRemove,
}: {
  field: FilterField;
  value: FilterValue;
  onRemove: () => void;
}) {
  let ontology = "";
  let chips: string[] = [];

  switch (value.type) {
    case "enum": {
      const lm = field.type === "enum" ? field.labelMap : undefined;
      chips = Array.from(value.selected).map((v) => lm?.[v] ?? v);
      ontology = chips.length === 1 ? "is" : "is one of";
      break;
    }
    case "range": {
      const unit = field.type === "range" ? (field.unit ?? "") : "";
      ontology = "between";
      chips = [`${value.min}${unit} — ${value.max}${unit}`];
      break;
    }
    case "boolean": {
      ontology = "is";
      chips = [value.value ? "Yes" : "No"];
      break;
    }
    case "text": {
      ontology = "contains";
      chips = [value.value];
      break;
    }
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="shrink-0 text-[11px] font-semibold text-white">{field.label}</span>
      <span className="shrink-0 text-[11px] text-white">{ontology}</span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1">
        {chips.map((chip) => (
          <span
            key={chip}
            className="truncate rounded bg-accent/15 px-1.5 py-px text-[10px] text-accent"
          >
            {chip}
          </span>
        ))}
      </div>
      <button
        onClick={onRemove}
        className="ml-auto shrink-0 flex items-center justify-center h-5 w-5 text-white/60 hover:text-white transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}

