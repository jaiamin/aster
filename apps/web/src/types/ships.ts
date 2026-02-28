export interface Ship {
  mmsi: number;
  name: string;
  longitude: number;
  latitude: number;
  speed: number | null;
  course: number | null;
  heading: number | null;
  shipType: number | null;
  navStatus: number | null;
  imo: number | null;
  callSign: string | null;
  destination: string | null;
  eta: string | null;
  draught: number | null;
  length: number | null;
  beam: number | null;
}

export interface SelectedShip {
  ship: Ship;
}
