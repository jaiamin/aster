import type { FilterValue } from "@/modules/explorer-context";
import type { FilterField } from "@/types/modules";

export function BooleanFilter({
  field,
  value,
  onChange,
  isActive: _isActive,
  onClear: _onClear,
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
