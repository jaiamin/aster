import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useExplorerData } from "@/modules/explorer-context";
import { useModuleSelection } from "@/modules/module-context";
import type {
  GPRecord,
  SatelliteDetail,
  SatellitePosition,
  SelectedSatellite,
} from "@/types/satellites";

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
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const { notifyItemSelected, notifyItemDeselected } = useExplorerData();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [gp, setGp] = useState<GPRecord | null>(null);
  const [detail, setDetail] = useState<SatelliteDetail | null>(null);
  const [tracking, setTracking] = useState(true);

  const currentPosition = selectedId ? (positions.find((p) => p.id === selectedId) ?? null) : null;

  const select = useCallback(
    (position: SatellitePosition, gpRecord: GPRecord) => {
      notifySelected("satellites");
      notifyItemSelected("satellites", position);
      setSelectedId((prev) => {
        if (prev !== position.id) {
          setDetail(null);
        }
        return position.id;
      });
      setGp(gpRecord);
      setTracking(true);
    },
    [notifySelected, notifyItemSelected],
  );

  const deselect = useCallback(() => {
    setSelectedId(null);
    setGp(null);
    setTracking(true);
    notifyItemDeselected("satellites");
  }, [notifyItemDeselected]);

  useEffect(() => {
    registerDeselect("satellites", deselect);
    return () => unregisterDeselect("satellites");
  }, [registerDeselect, unregisterDeselect, deselect]);

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
  useEffect(() => {
    selectedRef.current = selectedId;
  });
  useEffect(() => {
    if (selectedRef.current && !currentPosition) {
      deselect();
    }
  }, [currentPosition, deselect]);

  return (
    <SatelliteSelectionContext
      value={{ selected, tracking, select, deselect, pauseTracking, resumeTracking }}
    >
      {children}
    </SatelliteSelectionContext>
  );
}

export function useSatelliteSelection() {
  const ctx = useContext(SatelliteSelectionContext);
  if (!ctx) throw new Error("useSatelliteSelection must be used within SatelliteSelectionProvider");
  return ctx;
}
