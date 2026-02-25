export interface AirQualityStation {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  pm25: number;
  unit: string;
  lastUpdated: string | null;
}

export interface SelectedStation {
  station: AirQualityStation;
}
