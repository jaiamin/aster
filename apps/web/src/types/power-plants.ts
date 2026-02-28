export interface PowerPlant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  fuelType: string;
  capacityMw: number;
  owner: string | null;
  commissioningYear: number | null;
}

export interface SelectedPowerPlant {
  plant: PowerPlant;
}
