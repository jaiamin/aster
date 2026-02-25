import type { ComponentType, LucideIcon } from "lucide-react";

export interface QuickPick {
  name: string;
  targetId: number;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  MapLayer: ComponentType;
  useCount?: () => number | null;
  quickPicks?: QuickPick[];
}
