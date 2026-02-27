export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  longitude: number;
  latitude: number;
  depth: number;
  tsunami: boolean;
  alert: string | null;
  significance: number | null;
  magType: string | null;
  status: string | null;
  felt: number | null;
  url: string | null;
  country?: string;
}

export interface SelectedEarthquake {
  quake: Earthquake;
}
