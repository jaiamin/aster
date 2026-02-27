import type { ComponentType, LucideIcon } from "lucide-react";

export type FilterField =
  | { key: string; label: string; type: "range"; min: number; max: number; unit?: string }
  | { key: string; label: string; type: "enum"; options?: string[]; labelMap?: Record<string, string> }
  | { key: string; label: string; type: "boolean" }
  | { key: string; label: string; type: "text" };

export interface ListColumn {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "right";
  labelMap?: Record<string, string>;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  /** Zoom level when focusing on a selected item */
  focusZoom: number;
  MapLayer: ComponentType;
  source?: { name: string; url?: string };
  filters?: FilterField[];
  listColumns?: ListColumn[];
  /** Key used to extract a display name from each item for search/list */
  nameKey?: string;
}
