export const TIME_PRESETS = ["1h", "6h", "24h", "3d", "7d", "30d", "all"] as const;
export type TimePreset = (typeof TIME_PRESETS)[number];

const UNITS: Record<string, number> = { h: 3_600_000, d: 86_400_000 };

export function getFilterCutoff(preset: TimePreset): number | null {
  if (preset === "all") return null;
  const n = parseInt(preset);
  const unit = preset.replace(/\d+/, "");
  return Date.now() - n * UNITS[unit];
}

function parseItemTime(item: Record<string, unknown>, moduleId: string): number | null {
  switch (moduleId) {
    case "earthquakes": {
      const t = item.time;
      return typeof t === "number" ? t : null;
    }
    case "wildfires": {
      const d = item.acqDate;
      const t = item.acqTime;
      if (typeof d !== "string" || typeof t !== "string") return null;
      const ts = new Date(`${d}T${t.slice(0, 2)}:${t.slice(2)}`).getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    case "storms": {
      const t = item.lastUpdated;
      if (typeof t !== "string") return null;
      const ts = new Date(t).getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    case "buoys": {
      const t = item.time;
      if (typeof t !== "string") return null;
      const ts = new Date(t).getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    case "air-quality": {
      const t = item.lastUpdated;
      if (typeof t !== "string") return null;
      const ts = new Date(t).getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    case "volcanoes": {
      const t = item.date;
      if (typeof t !== "string") return null;
      const ts = new Date(t).getTime();
      return Number.isFinite(ts) ? ts : null;
    }
    case "launches": {
      const t = item.net;
      if (typeof t !== "string") return null;
      const ts = new Date(t).getTime();
      // Always include future launches
      if (Number.isFinite(ts) && ts > Date.now()) return null;
      return Number.isFinite(ts) ? ts : null;
    }
    default:
      return null;
  }
}

export function filterByTime<T>(items: T[], moduleId: string, preset: TimePreset): T[] {
  const cutoff = getFilterCutoff(preset);
  if (!cutoff) return items;
  return items.filter((item) => {
    const t = parseItemTime(item as Record<string, unknown>, moduleId);
    return t === null || t >= cutoff;
  });
}
