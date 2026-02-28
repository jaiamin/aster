import type { FilterValue } from "@/modules/explorer-context";
import type { FilterField } from "@/types/modules";

import { BooleanFilter } from "./boolean-filter";
import { EnumFilter } from "./enum-filter";
import { RangeFilter } from "./range-filter";

export function FilterControl({
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
      return (
        <RangeFilter
          field={field}
          value={value}
          onChange={onChange}
          isActive={isActive}
          onClear={onClear}
        />
      );
    case "enum":
      return (
        <EnumFilter
          field={field}
          value={value}
          data={data}
          onChange={onChange}
          isActive={isActive}
          onClear={onClear}
        />
      );
    case "boolean":
      return (
        <BooleanFilter
          field={field}
          value={value}
          onChange={onChange}
          isActive={isActive}
          onClear={onClear}
        />
      );
    default:
      return null;
  }
}
