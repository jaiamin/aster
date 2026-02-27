import { useEffect, useRef, useState, type ReactNode } from "react";
import { LocateFixed, X, ExternalLink, type LucideIcon } from "lucide-react";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";

/* ── ScrollText — hover to reveal truncated text ────────────── */

export function ScrollText({ text, className }: { text: string; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => setOffset(Math.max(0, inner.scrollWidth - outer.clientWidth));
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(outer);
    return () => obs.disconnect();
  }, [text]);

  // Ping-pong animation on hover
  useEffect(() => {
    const el = innerRef.current;
    if (!hovering || offset <= 0 || !el) return;

    let goingLeft = true;
    const speed = Math.max(offset * 30, 1200);
    el.style.transition = `transform ${speed}ms ease-in-out`;
    el.style.transform = `translateX(-${offset}px)`;

    const handler = () => {
      goingLeft = !goingLeft;
      el.style.transform = goingLeft ? `translateX(-${offset}px)` : "translateX(0)";
    };

    el.addEventListener("transitionend", handler);
    return () => {
      el.removeEventListener("transitionend", handler);
      el.style.transition = "transform 300ms ease";
      el.style.transform = "translateX(0)";
    };
  }, [hovering, offset]);

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden ${className ?? ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span ref={innerRef} className="inline-block whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}

/* ── DetailCard — outer shell ─────────────────────────────────── */

interface DetailCardProps {
  onClose: () => void;
  children: ReactNode;
}

export function DetailCard({ onClose, children }: DetailCardProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="absolute top-4 right-4 z-20 w-[370px] animate-slide-in-right">
      <div className="border border-panel-border bg-panel shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ── CardBanner — top image / gradient area ───────────────────── */

interface CardBannerProps {
  onClose: () => void;
  onRecenter?: () => void;
  accentColor: string;
  children: ReactNode;
  badge?: ReactNode;
}

export function CardBanner({
  onClose,
  onRecenter,
  accentColor,
  children,
  badge,
}: CardBannerProps) {
  return (
    <div className="relative">
      <div className="w-full h-[140px]">{children}</div>
      {badge && <div className="absolute top-2 left-2">{badge}</div>}
      <div className="absolute top-2 right-2 flex gap-1">
        {onRecenter && (
          <button
            onClick={onRecenter}
            className="p-1 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            title="Recenter"
          >
            <LocateFixed size={16} />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── CardHeader — icon + name + location subtitle ─────────────── */

interface CardHeaderProps {
  icon: LucideIcon;
  accentColor: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Extra detail shown after location (e.g. "· 2h ago") */
  detail?: string;
  onRecenter?: () => void;
  tracking?: boolean;
}

export function CardHeader({
  icon: Icon,
  accentColor,
  name,
  latitude,
  longitude,
  detail,
  onRecenter,
  tracking,
}: CardHeaderProps) {
  const location = useReverseGeocode(latitude, longitude);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            backgroundColor: accentColor,
            border: "1px solid rgba(255,255,255,0.8)",
          }}
        >
          <Icon size={13} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          {onRecenter ? (
            <button
              onClick={onRecenter}
              className={`block w-full text-left ${tracking ? "" : "hover:text-white/80"}`}
            >
              <ScrollText text={name} className="text-sm font-semibold text-white" />
            </button>
          ) : (
            <ScrollText text={name} className="text-sm font-semibold text-white" />
          )}
          {location && (
            <ScrollText text={location} className="text-xs text-muted" />
          )}
        </div>
      </div>
      {detail && (
        <ScrollText text={detail} className="text-[11px] text-muted pl-8" />
      )}
    </div>
  );
}

/* ── CardSection — labeled data section ───────────────────────── */

interface CardSectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function CardSection({ title, icon: Icon, children }: CardSectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted/60">
        {Icon && <Icon size={12} />}
        {title}
      </div>
      {children}
    </div>
  );
}

/* ── CardGrid — 2-column grid wrapper ─────────────────────────── */

interface CardGridProps {
  children: ReactNode;
}

export function CardGrid({ children }: CardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {children}
    </div>
  );
}

/* ── CardRows — single-column label/value grid ───────────────── */

interface CardRowsProps {
  children: ReactNode;
}

export function CardRows({ children }: CardRowsProps) {
  return (
    <div className="grid grid-cols-1 gap-y-1 text-xs">
      {children}
    </div>
  );
}

/* ── CardRow — single data row ────────────────────────────────── */

interface CardRowProps {
  label: string;
  value: string;
}

export function CardRow({ label, value }: CardRowProps) {
  return (
    <div className="flex gap-2">
      <span className="text-muted text-xs shrink-0">{label}</span>
      <ScrollText text={value} className="font-mono text-foreground text-xs min-w-0" />
    </div>
  );
}

/* ── CardCoordinates — replaces LocationFooter ────────────────── */

interface CardCoordinatesProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  altitudeLabel?: string;
  altitudeUnit?: string;
}

export function CardCoordinates({
  latitude,
  longitude,
  altitude,
  altitudeLabel = "Altitude",
  altitudeUnit = "ft",
}: CardCoordinatesProps) {
  return (
    <CardSection title="Coordinates">
      <CardGrid>
        <CardRow label="Latitude" value={`${latitude.toFixed(4)}\u00B0`} />
        <CardRow label="Longitude" value={`${longitude.toFixed(4)}\u00B0`} />
        {altitude != null && (
          <CardRow
            label={altitudeLabel}
            value={`${altitude.toLocaleString()} ${altitudeUnit}`}
          />
        )}
      </CardGrid>
    </CardSection>
  );
}

/* ── CardSource — bottom attribution ──────────────────────────── */

interface CardSourceProps {
  name: string;
  url?: string;
}

export function CardSource({ name, url }: CardSourceProps) {
  return (
    <div className="flex items-center justify-between pt-2 mt-1 border-t border-muted/20">
      <span className="text-[11px] font-medium text-muted/50">Source</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-foreground transition-colors"
        >
          {name} <ExternalLink size={10} />
        </a>
      ) : (
        <span className="text-[11px] text-muted/50">{name}</span>
      )}
    </div>
  );
}

/* ── CardBody — padding wrapper ───────────────────────────────── */

interface CardBodyProps {
  children: ReactNode;
}

export function CardBody({ children }: CardBodyProps) {
  return <div className="px-4 pt-4 pb-2 space-y-4">{children}</div>;
}
