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
  const [loaded, setLoaded] = useState(false);

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
        layers: [
          { id: "satellite", type: "raster", source: "satellite" },
        ],
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
      setLoaded(true);
      startRotation();
    });

    map.on("moveend", () => {
      rotatingRef.current = false;
      if (animatingRef.current) startRotation();
    });

    return () => {
      animatingRef.current = false;
      rotatingRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, zoom, pitch]);

  return (
    <div className="relative overflow-hidden w-full h-[140px]">
      {/* Fallback always in DOM to guarantee parent has layout height */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: loaded ? 0 : 1 }}
      >
        {fallback}
      </div>
      {/* Map container with explicit dimensions so MapLibre reads non-zero size */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, opacity: loaded ? 1 : 0, transition: "opacity 700ms" }}
      />
    </div>
  );
}
