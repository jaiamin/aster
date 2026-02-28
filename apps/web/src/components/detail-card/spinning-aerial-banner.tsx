import { useRef, useState, useEffect, type ReactNode } from "react";
import maplibregl from "maplibre-gl";

interface SpinningAerialBannerProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  pitch?: number;
  fallback: ReactNode;
}

const SATELLITE_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export function SpinningAerialBanner({
  latitude,
  longitude,
  zoom = 15,
  pitch = 70,
  fallback,
}: SpinningAerialBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animatingRef = useRef(true);
  const rotatingRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.offsetWidth === 0) return;

    animatingRef.current = true;
    rotatingRef.current = false;

    const map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [SATELLITE_TILE],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [{ id: "satellite", type: "raster", source: "satellite" }],
      },
      center: [longitude, latitude],
      zoom,
      pitch,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      maxTileCacheSize: 10,
    });

    mapRef.current = map;

    function startRotation() {
      if (!animatingRef.current || !mapRef.current || rotatingRef.current) return;
      rotatingRef.current = true;
      const bearing = mapRef.current.getBearing();
      mapRef.current.rotateTo(bearing - 90, {
        duration: 15_000,
        easing: (t: number) => t,
      });
    }

    map.once("idle", () => {
      if (!animatingRef.current) return;
      setStatus("loaded");
      startRotation();
    });

    // If tiles fail to load, show fallback after timeout
    const timeout = setTimeout(() => {
      if (!animatingRef.current) return;
      setStatus((s) => (s === "loading" ? "failed" : s));
    }, 5000);

    map.on("moveend", () => {
      rotatingRef.current = false;
      if (animatingRef.current) startRotation();
    });

    return () => {
      animatingRef.current = false;
      rotatingRef.current = false;
      clearTimeout(timeout);
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, zoom, pitch]);

  return (
    <div className="relative overflow-hidden w-full h-[140px]">
      {/* Loading shimmer — visible only while loading */}
      <div
        className="absolute inset-0 bg-surface animate-pulse transition-opacity duration-500"
        style={{ opacity: status === "loading" ? 1 : 0 }}
      />
      {/* Fallback — shown only if map fails to load */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: status === "failed" ? 1 : 0 }}
      >
        {fallback}
      </div>
      {/* Map container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          opacity: status === "loaded" ? 1 : 0,
          transition: "opacity 700ms",
        }}
      />
    </div>
  );
}
