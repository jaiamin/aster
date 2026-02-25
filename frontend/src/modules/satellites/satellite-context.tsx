import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { GPRecord, SatelliteDetail, SatellitePosition, SelectedSatellite } from "@/types/satellites";
import { useModules } from "@/modules/module-context";

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
  const { registerDeselect, notifySelected } = useModules();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [gp, setGp] = useState<GPRecord | null>(null);
  const [detail, setDetail] = useState<SatelliteDetail | null>(null);
  const [tracking, setTracking] = useState(true);

  const currentPosition = selectedId
    ? positions.find((p) => p.id === selectedId) ?? null
    : null;

  const select = useCallback((position: SatellitePosition, gpRecord: GPRecord) => {
    notifySelected("satellites");
    setSelectedId(position.id);
    setGp(gpRecord);
    setDetail(null);
    setTracking(true);
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelectedId(null);
    setGp(null);
    setDetail(null);
    setTracking(true);
  }, []);

  useEffect(() => { registerDeselect("satellites", deselect); }, [registerDeselect, deselect]);

  const pauseTracking = useCallback(() => setTracking(false), []);
  const resumeTracking = useCallback(() => setTracking(true), []);

  // Fetch detail once on selection
  useEffect(() => {
    if (!selectedId || !gp) return;
    const controller = new AbortController();

    fetch(`/api/satellites/${selectedId}/detail`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setDetail(data))
      .catch(() => {});

    return () => controller.abort();
  }, [selectedId]);

  const selected: SelectedSatellite | null =
    currentPosition && gp ? { position: currentPosition, gp, detail } : null;

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
