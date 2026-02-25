export interface NuclearFacility {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  countryCode: string | null;
  status: string;
  reactorType: string | null;
  reactorModel: string | null;
  capacity: number | null;
  operationalFrom: string | null;
  operationalTo: string | null;
  source: string | null;
}

export interface SelectedFacility {
  facility: NuclearFacility;
}
