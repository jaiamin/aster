import { useMemo, useState } from "react";

import type { FilterValue } from "@/modules/explorer-context";
import type { FilterField } from "@/types/modules";

export function EnumFilter({
  field,
  value,
  data,
  onChange,
  isActive: _isActive,
  onClear: _onClear,
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

  const options = useMemo(() => {
    if (field.options && field.options.length > 0) return field.options;
    const unique = new Set<string>();
    for (const item of data) {
      const val = (item as Record<string, unknown>)[field.key];
      if (val !== null && val !== undefined && val !== "") {
        unique.add(String(val));
      }
    }
    if (unique.size === 0 && field.labelMap) {
      return Object.keys(field.labelMap);
    }
    return Array.from(unique).sort();
  }, [field.options, field.key, field.labelMap, data]);

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
