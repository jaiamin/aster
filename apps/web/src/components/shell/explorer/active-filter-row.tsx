import { X } from "lucide-react";

import type { FilterValue } from "@/modules/explorer-context";
import type { FilterField } from "@/types/modules";

export function ActiveFilterRow({
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
