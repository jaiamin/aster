import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export function formatCellValue(val: unknown, col: { labelMap?: Record<string, string> }): string {
  const raw =
    val === null || val === undefined
      ? "\u2014"
      : typeof val === "number"
        ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : String(val);
  return col.labelMap?.[String(val)] ?? raw;
}

export function VirtualizedList({
  items,
  columns,
  colWidths,
  selectedIndex,
  onRowClick,
}: {
  items: unknown[];
  columns: {
    key: string;
    label: string;
    width?: string;
    align?: "left" | "right";
    labelMap?: Record<string, string>;
  }[];
  colWidths: number[];
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
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
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
              {columns.map((col, ci) => {
                const display = formatCellValue(item[col.key], col);
                return (
                  <span
                    key={col.key}
                    className={`truncate tabular-nums ${col.align === "right" ? "text-right" : "text-left"}`}
                    style={{
                      width: ci === 0 ? undefined : `${colWidths[ci]}px`,
                      flex: ci === 0 ? 1 : undefined,
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
