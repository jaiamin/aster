import { useEffect, useState } from "react";
import { PlaneTakeoff, PlaneLanding, Plane, X, LocateFixed } from "lucide-react";
import { LocationFooter } from "@/components/detail-card/location-footer";
import { useMap } from "@vis.gl/react-maplibre";
import { useFlightSelection } from "./flight-context";
import type { Airport, FlightTrack } from "@/types/flights";

function useElapsed(since: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (since == null) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);

  return elapsed;
}

function useAircraftPhoto(icao24: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUrl(null);
    setLoaded(false);
    if (!icao24) { setLoaded(true); return; }
    const controller = new AbortController();
    fetch(`https://hexdb.io/hex-image-thumb?hex=${icao24}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (text?.startsWith("http")) setUrl(text.trim());
        else setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => controller.abort();
  }, [icao24]);

  return { url, loaded, setLoaded };
}

function PlaceholderPlane() {
  return (
    <div className="w-full h-[140px] bg-surface flex items-center justify-center">
      <Plane size={64} strokeWidth={1} className="text-accent/20 -rotate-45" />
    </div>
  );
}

function AltitudeChart({ track }: { track: FlightTrack }) {
  const points = track.path.filter((wp) => wp.altitude != null);
  if (points.length < 2) return null;

  // Downsample to max 60 points — chart is ~300px wide, more is invisible
  const MAX_POINTS = 60;
  const sampled = points.length <= MAX_POINTS
    ? points
    : Array.from({ length: MAX_POINTS }, (_, i) =>
        points[Math.round((i / (MAX_POINTS - 1)) * (points.length - 1))],
      );

  const altitudes = sampled.map((wp) => wp.altitude! * 3.281); // meters to feet
  const maxAlt = Math.max(...altitudes);
  const minAlt = Math.min(...altitudes, 0);
  const range = maxAlt - minAlt || 1;

  const w = 296;
  const h = 64;
  const padTop = 4;
  const padBottom = 14;
  const chartH = h - padTop - padBottom;

  const pathPoints = altitudes.map((alt, i) => {
    const x = (i / (altitudes.length - 1)) * w;
    const y = padTop + chartH - ((alt - minAlt) / range) * chartH;
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(" L")}`;
  const areaPath = `${linePath} L${w},${h - padBottom} L0,${h - padBottom} Z`;

  const maxFt = Math.round(maxAlt).toLocaleString();
  const minFt = Math.round(minAlt).toLocaleString();

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-widest text-muted/60">
        Altitude Profile
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="alt-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d7ab5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3d7ab5" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#alt-fill)" />
          <path d={linePath} fill="none" stroke="#3d7ab5" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <div className="absolute top-0 right-0 text-[9px] text-muted/50">{maxFt} ft</div>
        <div className="absolute bottom-0 right-0 text-[9px] text-muted/50">{minFt} ft</div>
      </div>
    </div>
  );
}

export function FlightDetailCard() {
  const { selected, deselect, fetchedAt, tracking, resumeTracking } = useFlightSelection();
  const { current: mapRef } = useMap();
  const elapsed = useElapsed(fetchedAt);
  const { url: photoUrl, loaded: photoResolved, setLoaded } = useAircraftPhoto(
    selected?.flight.icao24 ?? "",
  );

  if (!selected) return null;

  const { flight, detail, track } = selected;
  const aircraft = detail?.aircraft;
  const route = detail?.route;

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="w-full h-[140px] object-cover bg-surface"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
          ) : photoResolved ? (
            <PlaceholderPlane />
          ) : (
            <div className="w-full h-[140px] bg-surface" />
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => {
                const map = mapRef?.getMap();
                if (!map) return;
                map.flyTo({
                  center: [flight.longitude, flight.latitude],
                  zoom: 7,
                  duration: 1500,
                });
                map.once("moveend", () => resumeTracking());
              }}
              className="p-1 bg-black/50 text-white/80 hover:text-accent hover:bg-black/70 transition-colors"
              title="Recenter on plane"
            >
              <LocateFixed size={16} />
            </button>
            <button
              onClick={deselect}
              className="p-1 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <button
                onClick={() => {
                  const map = mapRef?.getMap();
                  if (!map) return;
                  map.flyTo({
                    center: [flight.longitude, flight.latitude],
                    zoom: 7,
                    duration: 1500,
                  });
                  map.once("moveend", () => resumeTracking());
                }}
                className={`text-lg font-semibold transition-colors ${
                  tracking ? "text-accent" : "text-accent/60 hover:text-accent"
                }`}
              >
                {flight.callsign || flight.icao24}
              </button>
              {aircraft?.registration && (
                <span className="text-xs text-muted">{aircraft.registration}</span>
              )}
            </div>
            {aircraft && (
              <p className="text-sm text-muted mt-0.5">
                {[aircraft.manufacturer, aircraft.icaoType].filter(Boolean).join(" ") ||
                  aircraft.type}
                {aircraft.operator && <span> &middot; {aircraft.operator}</span>}
              </p>
            )}
          </div>

          {/* Route */}
          {route && (route.origin || route.destination) && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-muted/60">Route</div>
              <div className="space-y-1">
                {route.origin && (
                  <AirportRow airport={route.origin} icon={<PlaneTakeoff size={14} />} label="Departure" />
                )}
                {route.destination && (
                  <AirportRow airport={route.destination} icon={<PlaneLanding size={14} />} label="Arrival" />
                )}
              </div>
            </div>
          )}

          {/* Flight data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">Flight Data</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row
                label="Altitude"
                value={
                  flight.baro_altitude != null
                    ? `${Math.round(flight.baro_altitude * 3.281).toLocaleString()} ft`
                    : "—"
                }
              />
              <Row
                label="Speed"
                value={
                  flight.velocity != null
                    ? `${Math.round(flight.velocity * 1.944)} kts`
                    : "—"
                }
              />
              <Row
                label="Heading"
                value={flight.true_track != null ? `${Math.round(flight.true_track)}°` : "—"}
              />
              <Row label="Country" value={flight.origin_country} />
            </div>
          </div>

          {/* Altitude profile */}
          {track && <AltitudeChart track={track} />}

          <LocationFooter
            latitude={flight.latitude}
            longitude={flight.longitude}
            altitude={flight.baro_altitude != null ? Math.round(flight.baro_altitude * 3.281) : undefined}
          />

          {/* Last updated */}
          <div className="text-[11px] text-muted/50 text-center pt-1 border-t border-panel-border">
            Last updated {elapsed}s ago
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function AirportRow({ airport, icon, label }: { airport: Airport; icon: React.ReactNode; label: string }) {
  const { current: mapRef } = useMap();
  const { pauseTracking } = useFlightSelection();

  const handleClick = () => {
    if (airport.latitude == null || airport.longitude == null || !mapRef) return;
    pauseTracking();
    mapRef.flyTo({
      center: [airport.longitude, airport.latitude],
      zoom: 12,
      duration: 2000,
    });
  };

  const hasCoords = airport.latitude != null && airport.longitude != null;

  return (
    <button
      onClick={hasCoords ? handleClick : undefined}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors ${
        hasCoords ? "hover:bg-panel-hover cursor-pointer" : "cursor-default"
      }`}
    >
      <span className="text-accent/50 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted/50">{label}</span>
          <span className="font-semibold text-foreground text-sm">{airport.icao}</span>
        </div>
        <div className="text-xs text-muted leading-snug">{airport.name}</div>
      </div>
    </button>
  );
}
