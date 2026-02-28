import { ChevronLeft, ChevronUp, ChevronDown, Filter, Search, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActiveFilterRow } from "./active-filter-row";
import { FilterControl } from "./filter-control";
import { VirtualizedList, formatCellValue } from "./virtualized-list";

import { CATEGORY_COLORS } from "@/lib/category-colors";
import { useExplorer, useExplorerFilters } from "@/modules/explorer-context";
import { useModuleToggle } from "@/modules/module-context";
import { MODULE_REGISTRY } from "@/modules/registry";

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

  useEffect(() => {
    setSort(null);
    setSelectedIndex(null);
    setFiltersOpen(false);
  }, [openModuleId]);

  useEffect(() => {
    if (openModuleId && !enabledModules.has(openModuleId)) {
      toggle(openModuleId);
    }
  }, [openModuleId, enabledModules, toggle]);

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
  const rawData = useMemo(() => moduleData.get(moduleId) ?? [], [moduleData, moduleId]);

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(moduleId, localSearch), 200);
    return () => clearTimeout(id);
  }, [localSearch, moduleId, setSearch]);

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

  const colWidths = useMemo(() => {
    const cols = def?.listColumns;
    if (!cols) return [];
    const sample = sortedItems.slice(0, 200) as Record<string, unknown>[];
    return cols.map((col) => {
      let maxLen = col.label.length;
      for (const item of sample) {
        const display = formatCellValue(item[col.key], col);
        if (display.length > maxLen) maxLen = display.length;
      }
      return Math.max(maxLen * 7 + 16, 40);
    });
  }, [sortedItems, def?.listColumns]);

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        if (prev.dir === "asc") return { key, dir: "desc" };
        return null;
      }
      return { key, dir: "asc" };
    });
    setSelectedIndex(null);
  }, []);

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
      <div className="flex h-12 shrink-0 items-center gap-2 pl-3 pr-2 bg-accent">
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
          className="ml-auto flex h-6 w-6 items-center justify-center text-white/70 transition-colors hover:text-white"
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
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
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
            {def.listColumns.map((col, ci) => (
              <button
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted/60 hover:text-muted transition-colors ${col.align === "right" ? "justify-end" : ""}`}
                style={{
                  width: ci === 0 ? undefined : `${colWidths[ci]}px`,
                  flex: ci === 0 ? 1 : undefined,
                }}
              >
                {col.label}
                {sort?.key === col.key &&
                  (sort.dir === "asc" ? (
                    <ChevronUp size={10} className="shrink-0" />
                  ) : (
                    <ChevronDown size={10} className="shrink-0" />
                  ))}
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
            colWidths={colWidths}
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
