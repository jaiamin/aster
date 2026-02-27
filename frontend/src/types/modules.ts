import type { ComponentType, LucideIcon } from "lucide-react";

export interface QuickPick {
  name: string;
  targetId: number;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  /** Zoom level when focusing on a selected item */
  focusZoom: number;
  MapLayer: ComponentType;
  quickPicks?: QuickPick[];
  source?: { name: string; url?: string };
}
