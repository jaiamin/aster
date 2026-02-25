export interface Ship {
  mmsi: number;
  name: string;
  longitude: number;
  latitude: number;
  speed: number | null;
  course: number | null;
  heading: number | null;
  shipType: number | null;
}
