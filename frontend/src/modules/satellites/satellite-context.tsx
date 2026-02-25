import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { GPRecord, SatellitePosition, SelectedSatellite } from "@/types/satellites";

interface SatelliteSelectionContextValue {
  selected: SelectedSatellite | null;
  tracking: boolean;
  select: (position: SatellitePosition, gp: GPRecord) => void;
  deselect: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
}

const SatelliteSelectionContext = createContext<SatelliteSelectionContextValue | null>(null);

export function SatelliteSelectionProvider({
  positions,
  children,
}: {
  positions: SatellitePosition[];
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [gp, setGp] = useState<GPRecord | null>(null);
  const [tracking, setTracking] = useState(true);

  const currentPosition = selectedId
    ? positions.find((p) => p.id === selectedId) ?? null
    : null;

  const select = useCallback((position: SatellitePosition, gpRecord: GPRecord) => {
    setSelectedId(position.id);
    setGp(gpRecord);
    setTracking(true);
  }, []);

  const deselect = useCallback(() => {
    setSelectedId(null);
    setGp(null);
    setTracking(true);
  }, []);

  const pauseTracking = useCallback(() => setTracking(false), []);
  const resumeTracking = useCallback(() => setTracking(true), []);

  const selected: SelectedSatellite | null =
    currentPosition && gp ? { position: currentPosition, gp } : null;

  // Auto-deselect if satellite disappears from positions
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  useEffect(() => {
    if (selectedRef.current && !currentPosition) {
      deselect();
    }
  }, [currentPosition, deselect]);

  return (
    <SatelliteSelectionContext value={{ selected, tracking, select, deselect, pauseTracking, resumeTracking }}>
      {children}
    </SatelliteSelectionContext>
  );
}

export function useSatelliteSelection() {
  const ctx = useContext(SatelliteSelectionContext);
  if (!ctx) throw new Error("useSatelliteSelection must be used within SatelliteSelectionProvider");
  return ctx;
}
