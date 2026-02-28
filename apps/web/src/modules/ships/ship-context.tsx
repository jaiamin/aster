import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useModuleSelection } from "@/modules/module-context";
import type { Ship, SelectedShip } from "@/types/ships";

interface ShipSelectionContextValue {
  selected: SelectedShip | null;
  fetchedAt: number | null;
  tracking: boolean;
  select: (ship: Ship) => void;
  deselect: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
}

const ShipSelectionContext = createContext<ShipSelectionContextValue | null>(null);

export function ShipSelectionProvider({
  ships,
  children,
}: {
  ships: Ship[];
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModuleSelection();
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [tracking, setTracking] = useState(true);

  const currentShip = selectedMmsi ? (ships.find((s) => s.mmsi === selectedMmsi) ?? null) : null;

  // Update fetchedAt whenever the selected ship's position changes from a poll.
  // prevPos is intentionally NOT cleared on deselect so re-selecting the same
  // ship won't reset the timer if the position hasn't changed.
  const prevPos = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!currentShip) return;
    const pos = { lat: currentShip.latitude, lng: currentShip.longitude };
    if (!prevPos.current || prevPos.current.lat !== pos.lat || prevPos.current.lng !== pos.lng) {
      prevPos.current = pos;
      setFetchedAt(Date.now());
    }
  }, [currentShip?.latitude, currentShip?.longitude]);

  const select = useCallback(
    (ship: Ship) => {
      notifySelected("ships");
      setSelectedMmsi((prev) => {
        if (prev !== ship.mmsi) {
          prevPos.current = null;
        }
        return ship.mmsi;
      });
      setTracking(true);
    },
    [notifySelected],
  );

  const deselect = useCallback(() => {
    setSelectedMmsi(null);
    setTracking(true);
  }, []);

  useEffect(() => {
    registerDeselect("ships", deselect);
    return () => unregisterDeselect("ships");
  }, [registerDeselect, unregisterDeselect, deselect]);

  const pauseTracking = useCallback(() => setTracking(false), []);
  const resumeTracking = useCallback(() => setTracking(true), []);

  const selected: SelectedShip | null = currentShip ? { ship: currentShip } : null;

  // Auto-deselect if the ship disappears from the feed
  useEffect(() => {
    if (selectedMmsi && !currentShip) {
      deselect();
    }
  }, [selectedMmsi, currentShip, deselect]);

  return (
    <ShipSelectionContext
      value={{ selected, fetchedAt, tracking, select, deselect, pauseTracking, resumeTracking }}
    >
      {children}
    </ShipSelectionContext>
  );
}

export function useShipSelection() {
  const ctx = useContext(ShipSelectionContext);
  if (!ctx) throw new Error("useShipSelection must be used within ShipSelectionProvider");
  return ctx;
}
