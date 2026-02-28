export interface ForecastPoint {
  lat: number;
  lng: number;
  tau: number;
  maxWind: number | null;
  category: number;
}

export interface Storm {
  id: string;
  name: string;
  basin: string;
  stormType: string;
  category: number;
  windSpeed: number | null;
  gust: number | null;
  pressure: number | null;
  movementDir: number | null;
  movementSpeed: number | null;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  forecastTrack: ForecastPoint[];
  pastTrack: [number, number][];
}

export interface SelectedStorm {
  storm: Storm;
}
