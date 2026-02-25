import { useState } from "react";
import {
  Globe,
  ChevronLeft,
  Plane,
  Ship,
  Cloud,
  TrafficCone,
} from "lucide-react";

const MODULES = [
  { name: "Flights", icon: Plane },
  { name: "Maritime", icon: Ship },
  { name: "Weather", icon: Cloud },
  { name: "Traffic", icon: TrafficCone },
];

export function Sidebar() {
  const [modulesOpen, setModulesOpen] = useState(false);

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
          className={`mt-2 flex h-9 w-9 items-center justify-center rounded transition-all ${
            modulesOpen
              ? "bg-panel-hover text-accent"
              : "text-muted hover:bg-panel-hover hover:text-foreground"
          }`}
        >
          <Globe size={16} />
        </button>
      </div>

      {/* Modules flyout */}
      {modulesOpen && (
        <>
          <div className="h-full w-52 border-r border-panel-border bg-panel">
            <div className="flex h-12 items-center gap-2 px-4">
              <Globe size={18} className="text-muted" />
              <span className="text-[12px] font-medium tracking-widest text-muted">
                MODULES
              </span>
              <button
                onClick={() => setModulesOpen(false)}
                aria-label="Close modules"
                className="ml-auto flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-panel-hover hover:text-foreground"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="h-px bg-panel-border" />
            <div className="p-2">
              {MODULES.map(({ name, icon: Icon }) => (
                <div
                  key={name}
                  className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2 text-xs text-muted/60"
                >
                  <Icon size={14} />
                  {name}
                  <span className="ml-auto text-[9px] text-muted/30">SOON</span>
                </div>
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
