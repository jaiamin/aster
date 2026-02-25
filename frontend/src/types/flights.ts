export interface Flight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
}

export interface FlightsResponse {
  time: number;
  flights: Flight[];
}
