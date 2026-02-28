export interface GPRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  ELEMENT_SET_NO: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  OBJECT_ID: string;
  REV_AT_EPOCH: number;
}

export interface SatellitePosition {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
  altitude: number;
}

export interface OrbitPoint {
  longitude: number;
  latitude: number;
  altitude: number;
}

export interface SatCatRecord {
  objectType: string | null;
  owner: string | null;
  launchDate: string | null;
  launchSite: string | null;
  decayDate: string | null;
  period: number | null;
  apogee: number | null;
  perigee: number | null;
  rcs: number | null;
}

export interface SatelliteDetail {
  satcat: SatCatRecord | null;
}

export interface SelectedSatellite {
  position: SatellitePosition;
  gp: GPRecord;
  detail: SatelliteDetail | null;
}
