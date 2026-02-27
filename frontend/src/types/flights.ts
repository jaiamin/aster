export interface Flight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  squawk: string | null;
}

export interface FlightsResponse {
  time: number;
  flights: Flight[];
}

export interface TrackWaypoint {
  time: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  heading: number | null;
  on_ground: boolean;
}

export interface FlightTrack {
  icao24: string;
  callsign: string;
  startTime: number;
  endTime: number;
  path: TrackWaypoint[];
}

export interface Airport {
  icao: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface FlightDetail {
  aircraft: {
    registration: string | null;
    type: string | null;
    icaoType: string | null;
    manufacturer: string | null;
    operator: string | null;
  } | null;
  route: {
    origin: Airport | null;
    destination: Airport | null;
  } | null;
  photoUrl: string | null;
}

export interface SelectedFlight {
  flight: Flight;
  track: FlightTrack | null;
  detail: FlightDetail | null;
}
