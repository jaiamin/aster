import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Flight, FlightDetail, FlightTrack, SelectedFlight } from "@/types/flights";
import { useModules } from "@/modules/module-context";
import { usePageVisibility } from "@/hooks/use-page-visibility";

interface FlightSelectionContextValue {
  selected: SelectedFlight | null;
  fetchedAt: number | null;
  tracking: boolean;
  select: (flight: Flight) => void;
  deselect: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
}

const FlightSelectionContext = createContext<FlightSelectionContextValue | null>(null);

export function FlightSelectionProvider({
  flights,
  children,
}: {
  flights: Flight[];
  children: React.ReactNode;
}) {
  const { registerDeselect, unregisterDeselect, notifySelected } = useModules();
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [track, setTrack] = useState<FlightTrack | null>(null);
  const [detail, setDetail] = useState<FlightDetail | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [tracking, setTracking] = useState(true);

  const currentFlight = selectedIcao
    ? flights.find((f) => f.icao24 === selectedIcao) ?? null
    : null;

  // Update fetchedAt whenever the selected flight's position changes from a poll
  const prevPos = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!currentFlight) {
      prevPos.current = null;
      return;
    }
    const pos = { lat: currentFlight.latitude, lng: currentFlight.longitude };
    if (
      !prevPos.current ||
      prevPos.current.lat !== pos.lat ||
      prevPos.current.lng !== pos.lng
    ) {
      prevPos.current = pos;
      setFetchedAt(Date.now());
    }
  }, [currentFlight?.latitude, currentFlight?.longitude]);

  const select = useCallback((flight: Flight) => {
    notifySelected("flights");
    setSelectedIcao(flight.icao24);
    setTrack(null);
    setDetail(null);
    setFetchedAt(Date.now());
    setTracking(true);
  }, [notifySelected]);

  const deselect = useCallback(() => {
    setSelectedIcao(null);
    setTrack(null);
    setDetail(null);
    setFetchedAt(null);
    setTracking(true);
  }, []);

  useEffect(() => {
    registerDeselect("flights", deselect);
    return () => unregisterDeselect("flights");
  }, [registerDeselect, unregisterDeselect, deselect]);

  const pauseTracking = useCallback(() => setTracking(false), []);
  const resumeTracking = useCallback(() => setTracking(true), []);
  const visible = usePageVisibility();

  // Fetch detail once on selection
  useEffect(() => {
    if (!currentFlight) return;
    const controller = new AbortController();

    const qs = currentFlight.callsign ? `?callsign=${currentFlight.callsign}` : "";
    fetch(`/api/flights/${currentFlight.icao24}/detail${qs}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setDetail(data))
      .catch(() => {});

    return () => controller.abort();
  }, [selectedIcao]);

  // Poll track data to keep trail current
  useEffect(() => {
    if (!selectedIcao || !visible) return;
    const controller = new AbortController();

    function fetchTrack() {
      fetch(`/api/flights/${selectedIcao}/track`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setTrack(data))
        .catch(() => {});
    }

    fetchTrack();
    const id = setInterval(fetchTrack, 10_000);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [selectedIcao, visible]);

  const selected: SelectedFlight | null = currentFlight
    ? { flight: currentFlight, track, detail }
    : null;

  // Auto-deselect if the flight disappears from the feed
  useEffect(() => {
    if (selectedIcao && !currentFlight) {
      deselect();
    }
  }, [selectedIcao, currentFlight, deselect]);

  return (
    <FlightSelectionContext value={{ selected, fetchedAt, tracking, select, deselect, pauseTracking, resumeTracking }}>
      {children}
    </FlightSelectionContext>
  );
}

export function useFlightSelection() {
  const ctx = useContext(FlightSelectionContext);
  if (!ctx) throw new Error("useFlightSelection must be used within FlightSelectionProvider");
  return ctx;
}
