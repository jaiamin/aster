import { useState } from "react";
import { Satellite } from "lucide-react";
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
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";

const ISS_NORAD_ID = 25544;
const ISS_LIVE_URL = "https://www.youtube.com/embed/aB1yRz0HhdY?autoplay=1&mute=1&controls=0&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1";

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

function orbitType(periodMin: number, inclination: number, eccentricity: number): string {
  if (periodMin > 1400 && periodMin < 1500 && inclination < 5) return "GEO";
  if (eccentricity > 0.5 && periodMin > 600 && periodMin < 800) return "Molniya";
  if (inclination > 96 && inclination < 100 && periodMin < 130) return "SSO";
  if (periodMin < 128) return "LEO";
  if (periodMin < 800) return "MEO";
  return "HEO";
}

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

  if (!selected) return null;

  const isISS = selected.gp.NORAD_CAT_ID === ISS_NORAD_ID;

  const { position, gp, detail } = selected;
  const satcat = detail?.satcat;

  const periodMinutes = 1440 / gp.MEAN_MOTION;
  const altitudeKm = position.altitude / 1000;
  const speedKmS = (2 * Math.PI * (6371 + altitudeKm)) / (periodMinutes * 60);
  const epochAge = Math.floor((Date.now() - new Date(gp.EPOCH).getTime()) / 86_400_000);
  const orbit = orbitType(periodMinutes, gp.INCLINATION, gp.ECCENTRICITY);

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [position.longitude, position.latitude],
      zoom: zoomForAltitude(position.altitude),
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
    map.once("moveend", () => resumeTracking());
  };

  const flag = satcat?.owner ? flagUrl(satcat.owner) : null;
  const showFlag = flag && !imgError;

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={SAT_COLOR}>
        {isISS ? (
          <div className="relative w-full h-[140px] bg-surface">
            <iframe
              src={ISS_LIVE_URL}
              className="absolute inset-0 w-full h-full pointer-events-none"
              allow="autoplay; encrypted-media"
              tabIndex={-1}
            />
            {showFlag && (
              <img
                src={flag!}
                alt=""
                className="absolute top-2 left-2 h-5 rounded-sm shadow-md border border-white/20"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        ) : showFlag ? (
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
          accentColor={CATEGORY_COLORS["Tracking"]}
          name={gp.OBJECT_NAME}
          latitude={position.latitude}
          longitude={position.longitude}
          detail={satcat?.owner ? (OWNER_NAMES[satcat.owner] ?? satcat.owner) : undefined}
          onRecenter={recenter}
          tracking={tracking}
        />
        <CardSection title="Orbital Data">
          <CardGrid>
            <CardRow label="Orbit" value={orbit} />
            <CardRow label="Altitude" value={`${altitudeKm.toFixed(1)} km`} />
            <CardRow label="Speed" value={`${speedKmS.toFixed(2)} km/s`} />
            <CardRow label="Inclination" value={`${gp.INCLINATION.toFixed(2)}°`} />
            <CardRow label="Period" value={`${periodMinutes.toFixed(1)} min`} />
            <CardRow label="Eccentricity" value={gp.ECCENTRICITY.toFixed(6)} />
            {satcat?.apogee != null && (
              <CardRow label="Apogee" value={`${satcat.apogee} km`} />
            )}
            {satcat?.perigee != null && (
              <CardRow label="Perigee" value={`${satcat.perigee} km`} />
            )}
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
            <CardRow label="Revolutions" value={gp.REV_AT_EPOCH.toLocaleString()} />
            {satcat?.objectType && (
              <CardRow label="Type" value={TYPE_LABELS[satcat.objectType] ?? satcat.objectType} />
            )}
            {satcat?.launchDate && (
              <CardRow label="Launch Date" value={satcat.launchDate} />
            )}
            {satcat?.launchSite && (
              <CardRow label="Launch Site" value={satcat.launchSite} />
            )}
            {satcat?.decayDate && (
              <CardRow label="Decay Date" value={satcat.decayDate} />
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
        <CardSource name="CelesTrak" url="https://celestrak.org" />
      </CardBody>
    </DetailCard>
  );
}
