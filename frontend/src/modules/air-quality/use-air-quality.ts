import { usePolledData } from "@/hooks/use-polled-data";
import type { AirQualityStation } from "@/types/air-quality";

const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

const transform = (d: unknown) => {
  const cutoff = Date.now() - MAX_AGE_MS;
  return (d as AirQualityStation[]).filter((s) => !s.lastUpdated || new Date(s.lastUpdated).getTime() >= cutoff);
};

export function useAirQuality() {
  return usePolledData<AirQualityStation[]>({ endpoint: "/api/air-quality", interval: 300_000, transform });
}
