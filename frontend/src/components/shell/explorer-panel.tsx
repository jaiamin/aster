import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, SlidersHorizontal, Search } from "lucide-react";
import { useMap } from "@vis.gl/react-maplibre";
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
  } = useExplorer();

  const { enabledModules, toggle } = useModuleToggle();
  const { current: mapRef } = useMap();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const def = useMemo(
    () => MODULE_REGISTRY.find((m) => m.id === openModuleId) ?? null,
    [openModuleId],
  );

  const filterPredicate = useExplorerFilters(openModuleId ?? "");

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
      if (!filterPredicate(item)) return false;
      if (q && nameKey) {
        const name = String(item[nameKey] ?? "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [rawData, filterPredicate, search, def?.nameKey]);

  // Fly to item on click
  const handleRowClick = useCallback(
    (item: any) => {
      const map = mapRef?.getMap();
      if (!map || !def) return;
      const lng = item.longitude as number;
      const lat = item.latitude as number;
      if (typeof lng !== "number" || typeof lat !== "number") return;
      map.flyTo({ center: [lng, lat], zoom: def.focusZoom, duration: 1500 });
    },
    [mapRef, def],
  );

  if (!openModuleId || !def) return null;

  const color = CATEGORY_COLORS[def.category] ?? "#8892b0";
  const Icon = def.icon;
  const filtersActive = hasActiveFilters(moduleId);

  return (
    <div className="flex h-full w-80 flex-col border-r border-panel-border bg-panel">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 px-4 bg-accent">
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
        <span className="text-[13px] font-medium text-white translate-y-px">
          {def.name}
          <span className="ml-1 tabular-nums text-white/60">
            {filteredItems.length !== rawData.length
              ? `${filteredItems.length.toLocaleString()} / ${rawData.length.toLocaleString()}`
              : rawData.length.toLocaleString()}
          </span>
        </span>
        <button
          onClick={closeExplorer}
          aria-label="Close explorer"
          className="ml-auto flex h-6 w-6 items-center justify-center text-white transition-colors hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search bar + filter toggle */}
      <div className="flex shrink-0 items-center gap-2 border-b border-panel-border px-3 py-2">
        <div className="flex flex-1 items-center gap-2 rounded bg-panel-hover px-2 py-1">
          <Search size={12} className="shrink-0 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(moduleId, e.target.value)}
            placeholder={`Search ${def.name.toLowerCase()}...`}
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
            <SlidersHorizontal size={13} />
            {filtersActive && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </button>
        )}
      </div>

      {/* Filter controls */}
      {filtersOpen && def.filters && def.filters.length > 0 && (
        <div className="shrink-0 space-y-3 border-b border-panel-border px-3 py-3">
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
                // Rebuild filters without this key
                clearFilters(moduleId);
                for (const [k, v] of Object.entries(next)) {
                  setFilter(moduleId, k, v);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Active filter chips */}
      {filtersActive && (
        <ActiveFilterChips
          filters={activeFilters}
          schema={def.filters ?? []}
          onRemove={(key) => {
            const next = { ...activeFilters };
            delete next[key];
            clearFilters(moduleId);
            for (const [k, v] of Object.entries(next)) {
              setFilter(moduleId, k, v);
            }
          }}
          onClearAll={() => clearFilters(moduleId)}
        />
      )}

      {/* Item list */}
      <div className="flex-1 min-h-0 flex flex-col">
        {def.listColumns && def.listColumns.length > 0 && (
          <div className="flex shrink-0 items-center border-b border-panel-border px-3 py-1.5">
            {def.listColumns.map((col) => (
              <span
                key={col.key}
                className="text-[10px] uppercase tracking-wider text-muted/60"
                style={{ width: col.width ?? undefined, flex: col.width ? undefined : 1 }}
              >
                {col.label}
              </span>
            ))}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-[11px] text-muted/60">No items match current filters</span>
          </div>
        ) : (
          <VirtualizedList
            items={filteredItems}
            columns={def.listColumns ?? []}
            onRowClick={handleRowClick}
          />
        )}
      </div>

      {/* Source footer */}
      {def.source && (
        <div className="shrink-0 border-t border-panel-border px-3 py-2">
          <span className="text-[10px] text-muted/50">
            Source:{" "}
            {def.source.url ? (
              <a
                href={def.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-muted/30 hover:text-muted"
              >
                {def.source.name}
              </a>
            ) : (
              def.source.name
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Virtualized List ──────────────────────────────────────────────────────────

function VirtualizedList({
  items,
  columns,
  onRowClick,
}: {
  items: any[];
  columns: { key: string; label: string; width?: string }[];
  onRowClick: (item: any) => void;
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
          const item = items[vRow.index];
          return (
            <button
              key={vRow.key}
              onClick={() => onRowClick(item)}
              className="absolute left-0 flex w-full items-center px-3 text-[11px] text-white/70 transition-colors hover:bg-panel-hover hover:text-white"
              style={{
                height: `${vRow.size}px`,
                top: `${vRow.start}px`,
              }}
            >
              {columns.map((col) => {
                const val = item[col.key];
                const display =
                  val === null || val === undefined
                    ? "\u2014"
                    : typeof val === "number"
                      ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : String(val);
                return (
                  <span
                    key={col.key}
                    className="truncate tabular-nums"
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
  onClear: _onClear,
}: {
  field: FilterField;
  value: FilterValue | undefined;
  data: any[];
  onChange: (val: FilterValue) => void;
  onClear: () => void;
}) {
  switch (field.type) {
    case "range":
      return <RangeFilter field={field} value={value} onChange={onChange} />;
    case "enum":
      return <EnumFilter field={field} value={value} data={data} onChange={onChange} />;
    case "boolean":
      return <BooleanFilter field={field} value={value} onChange={onChange} />;
    default:
      return null;
  }
}

function RangeFilter({
  field,
  value,
  onChange,
}: {
  field: Extract<FilterField, { type: "range" }>;
  value: FilterValue | undefined;
  onChange: (val: FilterValue) => void;
}) {
  const min = value?.type === "range" ? value.min : field.min;
  const max = value?.type === "range" ? value.max : field.max;
  const unit = field.unit ?? "";
  const step = (field.max - field.min) <= 10 ? 0.1 : 1;

  return (
    <div>
      <label className="text-[11px] text-muted">{field.label}</label>
      <div className="mt-1 flex items-center gap-2">
        <span className="w-10 text-right text-[10px] tabular-nums text-white/60">
          {min}{unit}
        </span>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={step}
          value={min}
          onChange={(e) =>
            onChange({
              type: "range",
              min: Math.min(parseFloat(e.target.value), max),
              max,
            })
          }
          className="h-1 flex-1 cursor-pointer appearance-none rounded bg-panel-border accent-accent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="w-10 text-right text-[10px] tabular-nums text-white/60">
          {max}{unit}
        </span>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={step}
          value={max}
          onChange={(e) =>
            onChange({
              type: "range",
              min,
              max: Math.max(parseFloat(e.target.value), min),
            })
          }
          className="h-1 flex-1 cursor-pointer appearance-none rounded bg-panel-border accent-accent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
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
}: {
  field: Extract<FilterField, { type: "enum" }>;
  value: FilterValue | undefined;
  data: any[];
  onChange: (val: FilterValue) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = value?.type === "enum" ? value.selected : new Set<string>();

  // Derive options from data if not explicitly provided
  const options = useMemo(() => {
    if (field.options && field.options.length > 0) return field.options;
    const unique = new Set<string>();
    for (const item of data) {
      const val = item[field.key];
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
      <label className="text-[11px] text-muted">{field.label}</label>
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
            {opt}
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
}: {
  field: Extract<FilterField, { type: "boolean" }>;
  value: FilterValue | undefined;
  onChange: (val: FilterValue) => void;
}) {
  const checked = value?.type === "boolean" ? value.value : false;

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange({ type: "boolean", value: e.target.checked })}
        className="h-3 w-3 rounded border-muted/40 bg-transparent accent-accent"
      />
      <span className="text-[11px] text-muted">{field.label}</span>
    </label>
  );
}

// ── Active Filter Chips ───────────────────────────────────────────────────────

function ActiveFilterChips({
  filters,
  schema,
  onRemove,
  onClearAll,
}: {
  filters: Record<string, FilterValue>;
  schema: FilterField[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  const fieldMap = useMemo(() => new Map(schema.map((f) => [f.key, f])), [schema]);

  const chips = useMemo(() => {
    return Object.entries(filters).map(([key, val]) => {
      const field = fieldMap.get(key);
      const label = field?.label ?? key;
      let display = "";
      switch (val.type) {
        case "range": {
          const unit = field?.type === "range" ? (field.unit ?? "") : "";
          display = `${val.min}${unit}\u2013${val.max}${unit}`;
          break;
        }
        case "enum":
          display = val.selected.size <= 2
            ? Array.from(val.selected).join(", ")
            : `${val.selected.size} selected`;
          break;
        case "boolean":
          display = val.value ? "Yes" : "No";
          break;
        case "text":
          display = `"${val.value}"`;
          break;
      }
      return { key, label, display };
    });
  }, [filters, fieldMap]);

  if (chips.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-panel-border px-3 py-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => onRemove(chip.key)}
          className="flex items-center gap-1 rounded bg-accent/20 px-2 py-0.5 text-[10px] text-accent transition-colors hover:bg-accent/30"
        >
          {chip.label}: {chip.display}
          <X size={10} className="shrink-0" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="px-1 text-[10px] text-muted/50 hover:text-muted"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
