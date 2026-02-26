export interface Launch {
  id: string;
  name: string;
  status: string;
  net: string;
  rocketName: string;
  provider: string;
  missionName: string | null;
  missionOrbit: string | null;
  missionDescription: string | null;
  padName: string;
  padLocation: string;
  latitude: number;
  longitude: number;
  image: string | null;
  probability: number | null;
  url: string;
}

export interface SelectedLaunch {
  launch: Launch;
}
