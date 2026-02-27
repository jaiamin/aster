import { useState } from "react";
import { Satellite, Video } from "lucide-react";
import {
  DetailCard,
  CardBanner,
  CardHeader,
  CardSection,
  CardGrid,
  CardRow,
  CardCoordinates,
  CardSource,
  CardBody,
} from "@/components/detail-card/detail-card";
import { useMap } from "@vis.gl/react-maplibre";
import { useSatelliteSelection } from "./satellite-context";
import { zoomForAltitude } from "./satellites-layer";
import { CATEGORY_COLORS } from "@/lib/category-colors";

const ISS_NORAD_ID = 25544;
const ISS_LIVE_URL = "https://www.youtube.com/embed/aB1yRz0HhdY?autoplay=1&mute=1";

const OWNER_TO_ISO: Record<string, string> = {
  US: "us", CIS: "ru", PRC: "cn", JPN: "jp", IND: "in", FR: "fr",
  UK: "gb", GER: "de", IT: "it", CA: "ca", SKOR: "kr", IL: "il",
  BRAZ: "br", LUXE: "lu", ARGN: "ar", SPN: "es", SWED: "se",
  TURK: "tr", UAE: "ae", SAFR: "za", NZ: "nz", AUS: "au",
  INDO: "id", THAI: "th", MALA: "my", SING: "sg", CZCH: "cz",
  POL: "pl", NETH: "nl", DEN: "dk", NOR: "no", FIN: "fi",
  CHLE: "cl", COL: "co", PER: "pe", MEX: "mx", PAKI: "pk",
  BGD: "bd", EGYP: "eg", IRAN: "ir", NKOR: "kp", SWTZ: "ch",
  GREC: "gr", PORT: "pt", AUT: "at", BELG: "be", HUN: "hu",
  ROM: "ro", IRID: "us", ORB: "us", SES: "lu", O3B: "lu",
  GLOB: "us", ISS: "un", ESA: "eu", EUME: "eu", EUTE: "eu",
  NATO: "un", AB: "sa", AC: "ae", STLK: "us", ASRA: "at",
  LAOS: "la", VENZ: "ve", TMMC: "tm", BEL: "by",
};

const OWNER_NAMES: Record<string, string> = {
  US: "United States", CIS: "CIS (former USSR)", PRC: "China",
  JPN: "Japan", ISS: "ISS Program", IND: "India", FR: "France",
  ESA: "ESA", UK: "United Kingdom", GER: "Germany", IT: "Italy",
  CA: "Canada", SKOR: "South Korea", IL: "Israel", BRAZ: "Brazil",
  LUXE: "Luxembourg", ARGN: "Argentina", SPN: "Spain", SWED: "Sweden",
  TURK: "Turkey", UAE: "UAE", SAFR: "South Africa", NZ: "New Zealand",
  AUS: "Australia", INDO: "Indonesia", THAI: "Thailand",
};

const TYPE_LABELS: Record<string, string> = {
  PAY: "Payload", "R/B": "Rocket Body", DEB: "Debris", UNK: "Unknown",
};

function flagUrl(owner: string): string | null {
  const iso = OWNER_TO_ISO[owner];
  if (!iso) return null;
  return `https://flagcdn.com/w640/${iso}.png`;
}

function SatelliteFlagBanner({ flag, onError }: { flag: string; onError: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-[140px] bg-surface">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-surface" />}
      <img
        src={flag}
        alt=""
        className="w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={onError}
      />
      {loaded && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      )}
    </div>
  );
}

const SAT_COLOR = "#ef4444";

export function SatelliteDetailCard() {
  const { selected, tracking, deselect, resumeTracking } = useSatelliteSelection();
  const { current: mapRef } = useMap();
  const [imgError, setImgError] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(false);

  if (!selected) return null;

  const isISS = selected.gp.NORAD_CAT_ID === ISS_NORAD_ID;

  const { position, gp, detail } = selected;
  const satcat = detail?.satcat;

  const periodMinutes = 1440 / gp.MEAN_MOTION;
  const altitudeKm = position.altitude / 1000;
  const speedKmS = (2 * Math.PI * (6371 + altitudeKm)) / (periodMinutes * 60);
  const epochAge = Math.floor((Date.now() - new Date(gp.EPOCH).getTime()) / 86_400_000);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [position.longitude, position.latitude],
      zoom: zoomForAltitude(position.altitude),
      duration: 1500,
    });
    map.once("moveend", () => resumeTracking());
  };

  const flag = satcat?.owner ? flagUrl(satcat.owner) : null;
  const showFlag = flag && !imgError;

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={SAT_COLOR}>
        {showFlag ? (
          <SatelliteFlagBanner flag={flag!} onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-[140px] bg-surface flex items-center justify-center">
            <Satellite size={48} strokeWidth={1.5} className="text-white" />
          </div>
        )}
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Satellite}
          accentColor={CATEGORY_COLORS["Space"]}
          name={gp.OBJECT_NAME}
          latitude={position.latitude}
          longitude={position.longitude}
          detail={satcat?.owner ? (OWNER_NAMES[satcat.owner] ?? satcat.owner) : undefined}
          onRecenter={recenter}
          tracking={tracking}
        />
        <CardSection title="Orbital Data">
          <CardGrid>
            <CardRow label="Altitude" value={`${altitudeKm.toFixed(1)} km`} />
            <CardRow label="Speed" value={`${speedKmS.toFixed(2)} km/s`} />
            <CardRow label="Inclination" value={`${gp.INCLINATION.toFixed(2)}°`} />
            <CardRow label="Period" value={`${periodMinutes.toFixed(1)} min`} />
            <CardRow label="Eccentricity" value={gp.ECCENTRICITY.toFixed(6)} />
            {satcat?.rcs != null && (
              <CardRow label="RCS" value={`${satcat.rcs.toFixed(1)} m²`} />
            )}
          </CardGrid>
        </CardSection>
        <CardSection title="Metadata">
          <CardGrid>
            <CardRow label="NORAD ID" value={`${gp.NORAD_CAT_ID}`} />
            <CardRow label="Intl Designator" value={gp.OBJECT_ID} />
            <CardRow label="Epoch Age" value={`${epochAge}d ago`} />
            {satcat?.objectType && (
              <CardRow label="Type" value={TYPE_LABELS[satcat.objectType] ?? satcat.objectType} />
            )}
            {satcat?.launchDate && (
              <CardRow label="Launch Date" value={satcat.launchDate} />
            )}
            {satcat?.launchSite && (
              <CardRow label="Launch Site" value={satcat.launchSite} />
            )}
          </CardGrid>
        </CardSection>
        <CardCoordinates
          latitude={position.latitude}
          longitude={position.longitude}
          altitude={Math.round(altitudeKm)}
          altitudeLabel="Altitude"
          altitudeUnit="km"
        />
        {isISS && (
          <button
            onClick={() => setShowLiveFeed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20"
          >
            <Video size={14} />
            {showLiveFeed ? "Hide Live Feed" : "View Live Feed"}
          </button>
        )}
        <CardSource name="CelesTrak" url="https://celestrak.org" />
      </CardBody>

      {isISS && showLiveFeed && (
        <div className="mt-2 border border-panel-border bg-panel shadow-2xl overflow-hidden animate-slide-in-right">
          <div className="p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              ISS Live — Earth View
            </div>
            <div className="relative w-full aspect-video overflow-hidden bg-surface">
              <iframe
                src={ISS_LIVE_URL}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </DetailCard>
  );
}
