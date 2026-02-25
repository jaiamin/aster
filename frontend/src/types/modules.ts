import type { ComponentType, LucideIcon } from "lucide-react";

export interface ModuleDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  MapLayer: ComponentType;
}
