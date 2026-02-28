export interface Port {
  id: number;
  name: string;
  state: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface SelectedPort {
  port: Port;
}
