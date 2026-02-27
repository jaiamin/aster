import { useEffect, useState } from "react";
import { Plane, LocateFixed } from "lucide-react";
import {
  DetailCard,
  CardBanner,
  CardHeader,
  CardSection,
  CardGrid,
  CardRow,
  ScrollText,
  CardCoordinates,
  CardSource,
  CardBody,
} from "@/components/detail-card/detail-card";
import { useMap } from "@vis.gl/react-maplibre";
import { useFlightSelection } from "./flight-context";
import type { Airport, Flight, FlightTrack } from "@/types/flights";
import { CATEGORY_COLORS } from "@/lib/category-colors";

/* ── Helpers ──────────────────────────────────────────────────── */

/** Haversine distance in km between two coordinates */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function flightPhase(verticalRate: number | null): string {
  if (verticalRate == null) return "Unknown";
  if (verticalRate > 1.5) return "Climbing";
  if (verticalRate < -1.5) return "Descending";
  return "Cruising";
}

const EMERGENCY_SQUAWKS: Record<string, string> = {
  "7500": "Hijack",
  "7600": "Radio Failure",
  "7700": "Emergency",
};

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

function PlaceholderPlane() {
  return (
    <div className="w-full h-[140px] bg-surface flex items-center justify-center">
      <Plane size={48} strokeWidth={1.5} className="text-white" />
    </div>
  );
}

/** Nice altitude tick values (1k, 2k, 5k, 10k, 20k, etc.) */
function altTicks(min: number, max: number, count: number): number[] {
  const range = max - min || 1;
  const rough = range / count;
  const nice = [500, 1000, 2000, 2500, 5000, 10000, 20000, 50000];
  const step = nice.find((n) => n >= rough) ?? rough;
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max; v += step) ticks.push(v);
  return ticks;
}

function formatAltLabel(ft: number): string {
  return ft >= 1000 ? `${Math.round(ft / 1000)}k` : `${Math.round(ft)}`;
}

function AltitudeChart({ track }: { track: FlightTrack }) {
  const points = track.path.filter((wp) => wp.altitude != null);
  if (points.length < 2) return null;

  const MAX_POINTS = 80;
  const sampled = points.length <= MAX_POINTS
    ? points
    : Array.from({ length: MAX_POINTS }, (_, i) =>
        points[Math.round((i / (MAX_POINTS - 1)) * (points.length - 1))],
      );

  const altitudes = sampled.map((wp) => wp.altitude! * 3.281);
  const times = sampled.map((wp) => wp.time);

  const rawMax = Math.max(...altitudes);
  const rawMin = Math.min(...altitudes, 0);
  const ticks = altTicks(rawMin, rawMax, 3);
  const minAlt = Math.min(rawMin, ticks[0] ?? 0);
  const maxAlt = Math.max(rawMax, ticks[ticks.length - 1] ?? rawMax);
  const range = maxAlt - minAlt || 1;

  // Layout
  const marginLeft = 36;
  const marginRight = 6;
  const marginTop = 16;
  const marginBottom = 20;
  const w = 340;
  const h = 110;
  const plotW = w - marginLeft - marginRight;
  const plotH = h - marginTop - marginBottom;

  const toX = (i: number) => marginLeft + (i / (altitudes.length - 1)) * plotW;
  const toY = (alt: number) => marginTop + plotH - ((alt - minAlt) / range) * plotH;

  // Build smooth path
  const pts = altitudes.map((alt, i) => ({ x: toX(i), y: toY(alt) }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${marginTop + plotH} L${marginLeft},${marginTop + plotH} Z`;

  // Current point (last)
  const lastPt = pts[pts.length - 1];
  const currentAlt = Math.round(altitudes[altitudes.length - 1]);

  // Time axis labels
  const startTime = times[0];
  const endTime = times[times.length - 1];
  const durationMin = Math.round((endTime - startTime) / 60);
  const midTime = Math.round(durationMin / 2);

  return (
    <CardSection title="Altitude Profile">
      <div className="relative bg-white/[0.02] rounded border border-white/[0.04] overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ display: "block" }}>
          <defs>
            <linearGradient id="alt-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d7ab5" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3d7ab5" stopOpacity="0.01" />
            </linearGradient>
            <filter id="alt-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal gridlines + Y-axis labels */}
          {ticks.map((t) => {
            const y = toY(t);
            const tooClose = Math.abs(y - lastPt.y) < 12;
            return (
              <g key={t}>
                <line
                  x1={marginLeft} y1={y} x2={w - marginRight} y2={y}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
                />
                {!tooClose && (
                  <text
                    x={marginLeft - 3} y={y + 1}
                    textAnchor="end" dominantBaseline="middle"
                    fill="rgba(136,146,176,0.6)" fontSize="11" fontFamily="monospace"
                  >
                    {formatAltLabel(t)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={marginLeft} y1={marginTop + plotH}
            x2={w - marginRight} y2={marginTop + plotH}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
          />

          {/* X-axis time labels */}
          <text
            x={marginLeft} y={h - 3}
            textAnchor="start" fill="rgba(136,146,176,0.6)" fontSize="11" fontFamily="monospace"
          >
            0m
          </text>
          {durationMin > 5 && (
            <text
              x={marginLeft + plotW / 2} y={h - 3}
              textAnchor="middle" fill="rgba(136,146,176,0.6)" fontSize="11" fontFamily="monospace"
            >
              {midTime}m
            </text>
          )}
          <text
            x={w - marginRight} y={h - 3}
            textAnchor="end" fill="rgba(136,146,176,0.6)" fontSize="11" fontFamily="monospace"
          >
            {durationMin}m
          </text>

          {/* Area fill */}
          <path d={areaPath} fill="url(#alt-area)" />

          {/* Line with glow */}
          <path
            d={linePath} fill="none"
            stroke="#3d7ab5" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
            filter="url(#alt-glow)"
          />

          {/* Current altitude — dashed line from Y-axis to dot */}
          <line
            x1={marginLeft} y1={lastPt.y}
            x2={lastPt.x} y2={lastPt.y}
            stroke="#3d7ab5" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.5"
          />
          <text
            x={marginLeft - 3} y={lastPt.y + 1}
            textAnchor="end" dominantBaseline="middle"
            fill="#3d7ab5" fontSize="11" fontWeight="600" fontFamily="monospace"
          >
            {formatAltLabel(currentAlt)}
          </text>

          {/* Current position dot */}
          <circle cx={lastPt.x} cy={lastPt.y} r="3" fill="#3d7ab5" stroke="#fff" strokeWidth="1" />
        </svg>
      </div>
    </CardSection>
  );
}

export function FlightDetailCard() {
  const { selected, deselect, fetchedAt, tracking, pauseTracking, resumeTracking } = useFlightSelection();
  const { current: mapRef } = useMap();
  const elapsed = useElapsed(fetchedAt);
  const [photoLoaded, setPhotoLoaded] = useState(false);

  if (!selected) return null;

  const { flight, detail, track } = selected;
  const aircraft = detail?.aircraft;
  const route = detail?.route;
  const photoUrl = detail?.photoUrl ?? null;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [flight.longitude, flight.latitude],
      zoom: 7,
      duration: 1500,
    });
    map.once("moveend", () => resumeTracking());
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor="#3d7ab5">
        {photoUrl ? (
          <div className="relative w-full h-[140px] bg-surface">
            {!photoLoaded && <div className="absolute inset-0 animate-pulse bg-surface" />}
            <img
              src={photoUrl}
              alt=""
              className="w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: photoLoaded ? 1 : 0 }}
              onLoad={() => setPhotoLoaded(true)}
              onError={() => setPhotoLoaded(true)}
            />
          </div>
        ) : detail ? (
          <PlaceholderPlane />
        ) : (
          <div className="w-full h-[140px] bg-surface animate-pulse" />
        )}
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Plane}
          accentColor={CATEGORY_COLORS["Tracking"]}
          name={flight.callsign || flight.icao24}
          latitude={flight.latitude}
          longitude={flight.longitude}
          detail={`Last updated ${elapsed}s ago`}
          onRecenter={recenter}
          tracking={tracking}
        />

        {route && (route.origin || route.destination) && (
          <CardSection title="Route">
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                {route.origin && (
                  <RouteRow
                    label="Departure"
                    airport={route.origin}
                    mapRef={mapRef}
                    pauseTracking={pauseTracking}
                  />
                )}
                {route.destination && (
                  <RouteRow
                    label="Arrival"
                    airport={route.destination}
                    mapRef={mapRef}
                    pauseTracking={pauseTracking}
                  />
                )}
              </div>
              <RouteProgress flight={flight} route={route} />
            </div>
          </CardSection>
        )}

        {aircraft && (
          <CardSection title="Aircraft">
            <CardGrid>
              {aircraft.manufacturer && <CardRow label="Manufacturer" value={aircraft.manufacturer} />}
              {aircraft.type && <CardRow label="Model" value={aircraft.type} />}
              {aircraft.registration && <CardRow label="Registration" value={aircraft.registration} />}
              {aircraft.operator && <CardRow label="Operator" value={aircraft.operator} />}
            </CardGrid>
          </CardSection>
        )}

        <CardSection title="Flight Data">
          <CardGrid>
            <CardRow
              label="Phase"
              value={flightPhase(flight.vertical_rate)}
            />
            <CardRow
              label="Speed"
              value={
                flight.velocity != null
                  ? `${Math.round(flight.velocity * 1.944)} kts`
                  : "—"
              }
            />
            <CardRow
              label="Heading"
              value={flight.true_track != null ? `${Math.round(flight.true_track)}°` : "—"}
            />
            <CardRow
              label="V/S"
              value={
                flight.vertical_rate != null
                  ? `${flight.vertical_rate > 0 ? "+" : ""}${Math.round(flight.vertical_rate * 196.85)} ft/min`
                  : "—"
              }
            />
            <CardRow label="Country" value={flight.origin_country} />
            {flight.squawk && (
              <CardRow
                label="Squawk"
                value={
                  EMERGENCY_SQUAWKS[flight.squawk]
                    ? `${flight.squawk} (${EMERGENCY_SQUAWKS[flight.squawk]})`
                    : flight.squawk
                }
              />
            )}
          </CardGrid>
        </CardSection>

        {track && <AltitudeChart track={track} />}

        <CardCoordinates
          latitude={flight.latitude}
          longitude={flight.longitude}
          altitude={flight.baro_altitude != null ? Math.round(flight.baro_altitude * 3.281) : undefined}
        />
        <CardSource name="OpenSky Network" url="https://opensky-network.org" />
      </CardBody>
    </DetailCard>
  );
}

function RouteProgress({
  flight,
  route,
}: {
  flight: Flight;
  route: { origin: Airport | null; destination: Airport | null };
}) {
  const origin = route.origin;
  const dest = route.destination;
  if (!origin || !dest) return null;
  if (origin.latitude == null || dest.latitude == null) return null;

  const totalDist = haversineKm(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
  const remaining = haversineKm(flight.latitude, flight.longitude, dest.latitude, dest.longitude);
  const traveled = haversineKm(flight.latitude, flight.longitude, origin.latitude, origin.longitude);

  if (totalDist < 1) return null;

  const progress = Math.max(0, Math.min(1, traveled / (traveled + remaining)));

  const speedKmh = flight.velocity != null ? flight.velocity * 3.6 : null;
  let eta: string | null = null;
  if (speedKmh && speedKmh > 50) {
    const hoursLeft = remaining / speedKmh;
    const mins = Math.round(hoursLeft * 60);
    eta = mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins}m`;
  }

  const remainingNm = Math.round(remaining * 0.539957);

  return (
    <div className="space-y-1.5">
      <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[#3d7ab5] rounded-full transition-all duration-700"
          style={{ width: `${(progress * 100).toFixed(1)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted/60">
        <span>{remainingNm.toLocaleString()} nm remaining</span>
        {eta && <span>ETA {eta}</span>}
      </div>
    </div>
  );
}

function RouteRow({
  label,
  airport,
  mapRef,
  pauseTracking,
}: {
  label: string;
  airport: Airport;
  mapRef: ReturnType<typeof useMap>["current"];
  pauseTracking: () => void;
}) {
  const hasCoords = airport.latitude != null && airport.longitude != null;

  const flyTo = () => {
    if (!hasCoords || !mapRef) return;
    pauseTracking();
    mapRef.flyTo({
      center: [airport.longitude, airport.latitude],
      zoom: 14,
      duration: 2000,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted shrink-0">{label}</span>
      <ScrollText
        text={`[${airport.icao}] ${airport.name}`}
        className="font-mono text-foreground min-w-0 flex-1"
      />
      {hasCoords && (
        <button
          onClick={flyTo}
          className="shrink-0 ml-auto p-1 bg-white/5 hover:bg-white/10 text-muted/50 hover:text-foreground transition-colors"
          title={`Locate ${airport.icao}`}
        >
          <LocateFixed size={12} />
        </button>
      )}
    </div>
  );
}
