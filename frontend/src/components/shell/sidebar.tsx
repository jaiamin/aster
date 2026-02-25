import { useMemo, useState } from "react";
import { Layers, ChevronLeft, ChevronDown, ChevronRight } from "lucide-react";
import { MODULE_REGISTRY, CATEGORY_ORDER } from "@/modules/registry";
import { useModules } from "@/modules/module-context";
import type { ModuleDefinition } from "@/types/modules";

function ModuleRow({
  def,
  enabled,
  onToggle,
}: {
  def: ModuleDefinition;
  enabled: boolean;
  onToggle: () => void;
}) {
  const { icon: Icon, name, useCount, quickPicks } = def;
  const { focusTarget } = useModules();
  const count = useCount?.() ?? null;
  const [expanded, setExpanded] = useState(false);
  const hasQuickPicks = quickPicks && quickPicks.length > 0;

  return (
    <div>
      <div className="flex items-center">
        {hasQuickPicks ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-5 shrink-0 items-center justify-center text-muted/40 hover:text-muted transition-colors"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
            />
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        <button
          onClick={onToggle}
          className={`flex flex-1 items-center gap-3 px-2 py-1.5 text-xs transition-colors ${
            enabled
              ? "text-accent"
              : "text-muted hover:bg-panel-hover hover:text-foreground"
          }`}
        >
          <Icon size={14} />
          {name}
          {count != null && (
            <span className="text-[10px] tabular-nums text-muted/50">
              {count.toLocaleString()}
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
      </div>

      {hasQuickPicks && expanded && (
        <div className="relative ml-[9px] mb-1 border-l border-panel-border pl-[11px]">
          {quickPicks!.map((pick) => (
            <button
              key={pick.targetId}
              onClick={() => focusTarget(def.id, pick.targetId)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-muted hover:bg-panel-hover hover:text-foreground transition-colors"
            >
              <span className="h-1.5 w-1.5 bg-current opacity-40" />
              {pick.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  category,
  modules,
  enabledModules,
  onToggle,
}: {
  category: string;
  modules: ModuleDefinition[];
  enabledModules: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = modules.filter((m) => enabledModules.has(m.id)).length;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-panel-hover"
      >
        <ChevronRight
          size={12}
          className={`shrink-0 text-muted/40 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="font-medium text-muted tracking-wide uppercase text-[10px]">
          {category}
        </span>
        {activeCount > 0 && (
          <span className="ml-auto text-[9px] tabular-nums text-accent">
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
              onToggle={() => onToggle(def.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [modulesOpen, setModulesOpen] = useState(false);
  const { enabledModules, toggle } = useModules();

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

  return (
    <div className="relative flex h-full shrink-0">
      {/* Icon rail */}
      <div className="flex h-full w-12 flex-col items-center border-r border-panel-border bg-panel">
        <div className="flex h-12 w-full items-center justify-center">
          <span className="text-sm font-bold tracking-tight text-accent">S</span>
        </div>

        <div className="mx-2 h-px w-8 bg-panel-border" />

        <button
          onClick={() => setModulesOpen(!modulesOpen)}
          aria-label="Toggle modules"
          className={`mt-2 flex h-9 w-9 items-center justify-center transition-all ${
            modulesOpen
              ? "bg-panel-hover text-accent"
              : "text-muted hover:bg-panel-hover hover:text-foreground"
          }`}
        >
          <Layers size={16} />
        </button>
      </div>

      {/* Modules flyout */}
      {modulesOpen && (
        <>
          <div className="h-full w-64 border-r border-panel-border bg-panel">
            <div className="flex h-12 items-center gap-2 px-4">
              <Layers size={16} className="text-muted" />
              <span className="text-[12px] font-medium tracking-widest text-muted">
                LAYERS
              </span>
              <button
                onClick={() => setModulesOpen(false)}
                aria-label="Close modules"
                className="ml-auto flex h-6 w-6 items-center justify-center text-muted transition-colors hover:bg-panel-hover hover:text-foreground"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="h-px bg-panel-border" />
            <div className="p-2 space-y-0.5">
              {grouped.map(({ category, modules }) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  modules={modules}
                  enabledModules={enabledModules}
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
