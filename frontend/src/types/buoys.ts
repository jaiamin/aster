export interface Buoy {
  id: string;
  latitude: number;
  longitude: number;
  time: string;
  windDir: number | null;
  windSpeed: number | null;
  gust: number | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  pressure: number | null;
  airTemp: number | null;
  waterTemp: number | null;
  dewPoint: number | null;
}

export interface SelectedBuoy {
  buoy: Buoy;
}
