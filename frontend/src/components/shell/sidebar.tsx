import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Radio } from "lucide-react";

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute left-3 bottom-10 z-20 flex h-8 w-8 items-center justify-center rounded border border-panel-border bg-panel text-muted backdrop-blur-md transition-all hover:border-accent-dim hover:text-accent hover:shadow-[0_0_8px_var(--color-accent-dim)]"
        aria-label={open ? "Close sidebar" : "Open sidebar"}
      >
        {open ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      {/* Panel */}
      <div
        className={`scanline absolute left-0 top-0 z-10 h-full w-64 border-r border-panel-border bg-panel backdrop-blur-md transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-panel-border px-4 py-3">
            <Radio size={14} className="text-accent" />
            <span className="text-xs font-medium tracking-widest text-accent">
              SAKA
            </span>
          </div>

          {/* Module list placeholder */}
          <div className="flex-1 px-4 py-3">
            <p className="mb-3 text-[10px] tracking-widest text-muted">
              MODULES
            </p>
            <div className="space-y-2">
              {["Flights", "Maritime", "Weather", "Traffic"].map((mod) => (
                <div
                  key={mod}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-muted/60 cursor-not-allowed"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted/30" />
                  {mod}
                  <span className="ml-auto text-[9px] text-muted/30">
                    SOON
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
