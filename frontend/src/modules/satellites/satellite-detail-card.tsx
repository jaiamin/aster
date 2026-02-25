import { useState } from "react";
import { Satellite, LocateFixed, X } from "lucide-react";
import { useMap } from "@vis.gl/react-maplibre";
import { useSatelliteSelection } from "./satellite-context";
import { zoomForAltitude } from "./satellites-layer";

// CelesTrak owner code → ISO 3166-1 alpha-2 (lowercase) for flag CDN
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

export function SatelliteDetailCard() {
  const { selected, tracking, deselect, resumeTracking } = useSatelliteSelection();
  const { current: mapRef } = useMap();
  const [imgError, setImgError] = useState(false);

  if (!selected) return null;

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
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="rounded-xl border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Flag or placeholder */}
        <div className="relative">
          {showFlag ? (
            <img
              src={flag!}
              alt=""
              className="w-full h-[140px] object-cover bg-surface"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-[140px] bg-surface flex items-center justify-center">
              <Satellite size={64} strokeWidth={1} className="text-[#ffb432]/20 rotate-12" />
            </div>
          )}
          {/* Dark overlay so buttons remain visible on light flags */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={recenter}
              className="rounded-md p-1 bg-black/50 text-white/80 hover:text-[#ffb432] hover:bg-black/70 transition-colors"
              title="Recenter on satellite"
            >
              <LocateFixed size={16} />
            </button>
            <button
              onClick={deselect}
              className="rounded-md p-1 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
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
                onClick={recenter}
                className={`text-lg font-semibold transition-colors ${
                  tracking ? "text-[#ffb432]" : "text-[#ffb432]/60 hover:text-[#ffb432]"
                }`}
              >
                {gp.OBJECT_NAME}
              </button>
              {satcat?.owner && (
                <span className="text-xs text-muted">
                  {OWNER_NAMES[satcat.owner] ?? satcat.owner}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              NORAD {gp.NORAD_CAT_ID}
              {satcat?.objectType && (
                <span> &middot; {TYPE_LABELS[satcat.objectType] ?? satcat.objectType}</span>
              )}
            </p>
          </div>

          {/* Orbital Data */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Orbital Data
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Altitude" value={`${altitudeKm.toFixed(1)} km`} />
              <Row label="Speed" value={`${speedKmS.toFixed(2)} km/s`} />
              <Row label="Inclination" value={`${gp.INCLINATION.toFixed(2)}°`} />
              <Row label="Period" value={`${periodMinutes.toFixed(1)} min`} />
              <Row label="Eccentricity" value={gp.ECCENTRICITY.toFixed(6)} />
              {satcat?.rcs != null && (
                <Row label="RCS" value={`${satcat.rcs.toFixed(1)} m²`} />
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Metadata
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Intl Designator" value={gp.OBJECT_ID} />
              <Row label="Epoch Age" value={`${epochAge}d ago`} />
              {satcat?.launchDate && (
                <Row label="Launch Date" value={satcat.launchDate} />
              )}
              {satcat?.launchSite && (
                <Row label="Launch Site" value={satcat.launchSite} />
              )}
            </div>
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
      <span className="text-foreground">{value}</span>
    </div>
  );
}
