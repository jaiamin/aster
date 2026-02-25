export interface Airport {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  country: string | null;
  region: string | null;
  municipality: string | null;
  iata: string | null;
  icao: string | null;
}

export interface SelectedAirport {
  airport: Airport;
}
