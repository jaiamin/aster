import { Satellite, LocateFixed, X } from "lucide-react";
import { useMap } from "@vis.gl/react-maplibre";
import { useSatelliteSelection } from "./satellite-context";
import { zoomForAltitude } from "./satellites-layer";

export function SatelliteDetailCard() {
  const { selected, tracking, deselect, resumeTracking } = useSatelliteSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { position, gp } = selected;

  const periodMinutes = 1440 / gp.MEAN_MOTION;
  const altitudeKm = position.altitude / 1000;
  // Orbital speed approximation: v = 2π(R+h) / T
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

  return (
    <div className="absolute top-4 right-4 z-20 w-[340px] animate-slide-in-right">
      <div className="rounded-xl border border-panel-border bg-panel/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="relative flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="rounded-lg bg-[#ffb432]/10 p-2">
            <Satellite size={20} className="text-[#ffb432]" />
          </div>
          <div className="min-w-0 flex-1">
            <button
              onClick={recenter}
              className={`text-lg font-semibold transition-colors ${
                tracking ? "text-[#ffb432]" : "text-[#ffb432]/60 hover:text-[#ffb432]"
              }`}
            >
              {gp.OBJECT_NAME}
            </button>
            <p className="text-xs text-muted">NORAD {gp.NORAD_CAT_ID}</p>
          </div>
          <div className="absolute top-3 right-3 flex gap-1">
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

        <div className="p-4 pt-0 space-y-4">
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
              <Row label="NORAD ID" value={String(gp.NORAD_CAT_ID)} />
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted/60">
              Metadata
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row label="Intl Designator" value={gp.OBJECT_ID} />
              <Row
                label="Epoch Age"
                value={`${epochAge}d ago`}
              />
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
