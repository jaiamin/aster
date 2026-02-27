import { usePolledData } from "@/hooks/use-polled-data";
import type { Flight } from "@/types/flights";

const transform = (d: unknown) => (d as { flights: Flight[] }).flights;

export function useFlights() {
  return usePolledData<Flight[]>({ endpoint: "/api/flights", interval: 30_000, transform });
}
