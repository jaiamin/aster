export interface Wildfire {
  latitude: number;
  longitude: number;
  brightness: number;
  frp: number;
  confidence: string;
  acqDate: string;
  acqTime: string;
  daynight: string;
  country?: string;
}

export interface SelectedWildfire {
  fire: Wildfire;
}
