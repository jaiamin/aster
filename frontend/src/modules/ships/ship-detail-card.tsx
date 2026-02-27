import { useEffect, useState } from "react";
import { Ship as ShipIcon, LocateFixed } from "lucide-react";
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
import { useShipSelection } from "./ship-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { SHIP_TYPE_LABELS, NAV_STATUS_LABELS } from "./ship-labels";

interface PortLocation {
  name: string;
  latitude: number;
  longitude: number;
}

function getShipTypeLabel(code: number | null): string {
  if (code == null) return "Unknown";
  if (SHIP_TYPE_LABELS[code]) return SHIP_TYPE_LABELS[code];
  const decade = Math.floor(code / 10) * 10;
  if (SHIP_TYPE_LABELS[decade]) return SHIP_TYPE_LABELS[decade];
  return "Unknown";
}

function getNavStatusLabel(code: number | null): string {
  if (code == null) return "Unknown";
  return NAV_STATUS_LABELS[code] ?? "Unknown";
}

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

const portCache = new Map<string, PortLocation | null>();

function usePortLookup(destination: string | null): PortLocation | null {
  const [port, setPort] = useState<PortLocation | null>(() =>
    destination ? portCache.get(destination) ?? null : null,
  );

  useEffect(() => {
    if (!destination) {
      setPort(null);
      return;
    }

    const cached = portCache.get(destination);
    if (cached !== undefined) {
      setPort(cached);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/ports/lookup?q=${encodeURIComponent(destination)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: PortLocation | null) => {
        portCache.set(destination, data);
        setPort(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [destination]);

  return port;
}

export function ShipDetailCard() {
  const { selected, deselect, fetchedAt, tracking, pauseTracking, resumeTracking } = useShipSelection();
  const { current: mapRef } = useMap();
  const elapsed = useElapsed(fetchedAt);
  const port = usePortLookup(selected?.ship.destination ?? null);

  if (!selected) return null;

  const { ship } = selected;
  const typeLabel = getShipTypeLabel(ship.shipType);

  const hasVoyage = ship.destination || ship.eta;
  const hasDetails = ship.imo || ship.callSign || ship.length || ship.draught;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [ship.longitude, ship.latitude],
      zoom: FOCUS_ZOOM["ships"],
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
    map.once("moveend", () => resumeTracking());
  };

  const flyToPort = () => {
    if (!port || !mapRef) return;
    pauseTracking();
    mapRef.flyTo({
      center: [port.longitude, port.latitude],
      zoom: 14,
      duration: 2000,
      padding: DETAIL_CARD_PADDING,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor="#3d7ab5">
        <div className="w-full h-[140px] bg-surface flex items-center justify-center">
          <ShipIcon size={48} strokeWidth={1.5} className="text-white" />
        </div>
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={ShipIcon}
          accentColor={CATEGORY_COLORS["Tracking"]}
          name={ship.name ? (typeLabel !== "Unknown" ? `${ship.name} (${typeLabel})` : ship.name) : `MMSI ${ship.mmsi}`}
          latitude={ship.latitude}
          longitude={ship.longitude}
          detail={`${elapsed}s ago`}
          onRecenter={recenter}
          tracking={tracking}
        />

        {hasVoyage && (
          <CardSection title="Voyage">
            <div className="space-y-1 text-xs">
              {ship.destination && (
                <div className="flex items-center gap-2">
                  <span className="text-muted shrink-0">Destination</span>
                  <ScrollText
                    text={port ? `${ship.destination} — ${port.name}` : ship.destination}
                    className="font-mono text-foreground min-w-0 flex-1"
                  />
                  {port && (
                    <button
                      onClick={flyToPort}
                      className="shrink-0 ml-auto p-1 bg-white/5 hover:bg-white/10 text-muted/50 hover:text-foreground transition-colors"
                      title={`Locate ${port.name}`}
                    >
                      <LocateFixed size={12} />
                    </button>
                  )}
                </div>
              )}
              {ship.eta && (
                <div className="flex items-center gap-2">
                  <span className="text-muted shrink-0">ETA</span>
                  <span className="font-mono text-foreground">{ship.eta}</span>
                </div>
              )}
            </div>
          </CardSection>
        )}

        {hasDetails && (
          <CardSection title="Vessel Details">
            <CardGrid>
              {ship.imo != null && <CardRow label="IMO" value={`${ship.imo}`} />}
              {ship.callSign && <CardRow label="Call Sign" value={ship.callSign} />}
              {ship.length != null && ship.beam != null && (
                <CardRow label="Dimensions" value={`${ship.length} × ${ship.beam} m`} />
              )}
              {ship.length != null && ship.beam == null && (
                <CardRow label="Length" value={`${ship.length} m`} />
              )}
              {ship.draught != null && <CardRow label="Draught" value={`${ship.draught} m`} />}
            </CardGrid>
          </CardSection>
        )}

        <CardSection title="Vessel Data">
          <CardGrid>
            <CardRow
              label="Status"
              value={getNavStatusLabel(ship.navStatus)}
            />
            <CardRow
              label="Speed"
              value={ship.speed != null ? `${ship.speed.toFixed(1)} kts` : "—"}
            />
            <CardRow
              label="Course"
              value={ship.course != null ? `${Math.round(ship.course)}°` : "—"}
            />
            <CardRow
              label="Heading"
              value={ship.heading != null ? `${Math.round(ship.heading)}°` : "—"}
            />
            <CardRow label="MMSI" value={`${ship.mmsi}`} />
          </CardGrid>
        </CardSection>
        <CardCoordinates latitude={ship.latitude} longitude={ship.longitude} />
        <CardSource name="AIS Vessel Data" url="https://www.marinetraffic.com" />
      </CardBody>
    </DetailCard>
  );
}
