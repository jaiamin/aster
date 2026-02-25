import type { LucideIcon } from "lucide-react";

// Pin dimensions
const PIN_W = 32;
const PIN_BODY = 32;
const CARET_H = 8;
const PIN_H = PIN_BODY + CARET_H; // 40
const ICON_SIZE = 18;
const STATUS_R = 4;
const STATUS_BORDER = 1.5;

export interface PinConfig {
  moduleId: string;
  icon: LucideIcon;
  bgColor: string;
  statusVariants?: { key: string; dotColor: string }[];
}

// ---------------------------------------------------------------------------
// SVG extraction: build SVG markup from Lucide icon without React rendering
// ---------------------------------------------------------------------------

// Darken a hex color by a factor (0–1, where 1 = black)
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${Math.round(r * f).toString(16).padStart(2, "0")}${Math.round(g * f).toString(16).padStart(2, "0")}${Math.round(b * f).toString(16).padStart(2, "0")}`;
}

// camelCase → kebab-case for SVG attributes
function toKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function lucideToSvg(Icon: LucideIcon, size: number): string {
  // Lucide icons are forwardRef components created via createLucideIcon.
  // Calling .render(props, ref) returns a React element whose props.iconNode
  // contains the raw SVG path data as [tagName, attrs][] tuples.
  const fwd = Icon as unknown as { render?: (...args: unknown[]) => unknown };
  const element = fwd.render?.({
    size,
    color: "#ffffff",
    strokeWidth: 2,
    children: [],
  }, null) as { props?: { iconNode?: [string, Record<string, string>][] } } | null;

  const iconNode = element?.props?.iconNode ?? [];

  // Build SVG child elements from the icon node tuples
  let inner = "";
  for (const [tag, attrs] of iconNode) {
    const attrStr = Object.entries(attrs)
      .filter(([k]) => k !== "key")
      .map(([k, v]) => `${toKebab(k)}="${v}"`)
      .join(" ");
    inner += `<${tag} ${attrStr}/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// ---------------------------------------------------------------------------
// Load SVG string into an Image (for canvas drawing)
// ---------------------------------------------------------------------------

function svgToImage(svgMarkup: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image(width, height);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Draw the pin shape (square body + caret) as a path
// ---------------------------------------------------------------------------

function pinPath(ctx: CanvasRenderingContext2D) {
  const hw = PIN_W / 2;
  ctx.beginPath();
  // Square body
  ctx.rect(0, 0, PIN_W, PIN_BODY);
  // Caret triangle
  ctx.moveTo(hw - 6, PIN_BODY);
  ctx.lineTo(hw, PIN_H);
  ctx.lineTo(hw + 6, PIN_BODY);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Render a single pin icon to ImageData
// ---------------------------------------------------------------------------

// Padding around pin — must fit both the selected outline and the status dot
// Status dot at corner extends STATUS_R + STATUS_BORDER = 5.5px beyond pin edge
const PAD = Math.ceil(STATUS_R + STATUS_BORDER); // 6px

async function renderPinIcon(opts: {
  svgImg: HTMLImageElement;
  bgColor: string;
  statusColor?: string;
  selected?: boolean;
}): Promise<ImageData> {
  const dpr = 2;
  const cw = PIN_W + PAD * 2;
  const ch = PIN_H + PAD * 2;
  const canvas = document.createElement("canvas");
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.translate(PAD, PAD); // offset so pin draws within padded area

  // Outline always visible — stroke first, fill covers inner half
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3; // half bleeds outward = 1.5px visible
  pinPath(ctx);
  ctx.stroke();

  // Fill pin shape — selected gets a darkened background
  ctx.fillStyle = opts.selected ? darken(opts.bgColor, 0.35) : opts.bgColor;
  pinPath(ctx);
  ctx.fill();

  // Draw icon centered in the square body
  const iconX = (PIN_W - ICON_SIZE) / 2;
  const iconY = (PIN_BODY - ICON_SIZE) / 2;
  ctx.drawImage(opts.svgImg, iconX, iconY, ICON_SIZE, ICON_SIZE);

  // Status dot
  if (opts.statusColor) {
    const dotX = PIN_W;
    const dotY = 0;
    // Dark ring
    ctx.beginPath();
    ctx.arc(dotX, dotY, STATUS_R + STATUS_BORDER, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();
    // Color fill
    ctx.beginPath();
    ctx.arc(dotX, dotY, STATUS_R, 0, Math.PI * 2);
    ctx.fillStyle = opts.statusColor;
    ctx.fill();
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ---------------------------------------------------------------------------
// Register all pin image variants for a module with the map
// ---------------------------------------------------------------------------

// pixelRatio maps padded canvas back to intended display size
const PIXEL_RATIO = ((PIN_W + PAD * 2) * 2) / PIN_W; // ≈ 2.25

export async function registerModulePins(
  map: maplibregl.Map,
  config: PinConfig,
): Promise<void> {
  const { moduleId, icon, bgColor, statusVariants } = config;

  // Check if already registered
  const checkId = statusVariants?.length
    ? `${moduleId}-pin-${statusVariants[0].key}`
    : `${moduleId}-pin`;
  if (map.hasImage(checkId)) return;

  // Render the Lucide icon to an SVG string, then load as Image
  const svgMarkup = lucideToSvg(icon, ICON_SIZE);
  const svgImg = await svgToImage(svgMarkup, ICON_SIZE, ICON_SIZE);

  if (statusVariants && statusVariants.length > 0) {
    // Status-based: register variant for each status key
    for (const { key, dotColor } of statusVariants) {
      const normal = await renderPinIcon({ svgImg, bgColor, statusColor: dotColor });
      const selected = await renderPinIcon({ svgImg, bgColor, statusColor: dotColor, selected: true });
      if (!map.hasImage(`${moduleId}-pin-${key}`)) {
        map.addImage(`${moduleId}-pin-${key}`, normal, { pixelRatio: PIXEL_RATIO });
      }
      if (!map.hasImage(`${moduleId}-pin-${key}-selected`)) {
        map.addImage(`${moduleId}-pin-${key}-selected`, selected, { pixelRatio: PIXEL_RATIO });
      }
    }
  } else {
    // No status: just normal + selected
    const normal = await renderPinIcon({ svgImg, bgColor });
    const selected = await renderPinIcon({ svgImg, bgColor, selected: true });
    if (!map.hasImage(`${moduleId}-pin`)) {
      map.addImage(`${moduleId}-pin`, normal, { pixelRatio: PIXEL_RATIO });
    }
    if (!map.hasImage(`${moduleId}-pin-selected`)) {
      map.addImage(`${moduleId}-pin-selected`, selected, { pixelRatio: PIXEL_RATIO });
    }
  }
}
