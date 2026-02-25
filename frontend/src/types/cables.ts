export interface CableFeature {
  type: "Feature";
  geometry: {
    type: "MultiLineString";
    coordinates: number[][][];
  };
  properties: {
    id: string;
    name: string;
    color: string;
    feature_id: string;
    coordinates: number[];
  };
}

export interface LandingPointFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: number[];
  };
  properties: {
    id: string;
    name: string;
    is_tbd: boolean;
  };
}

export interface CableData {
  cables: GeoJSON.FeatureCollection;
  landingPoints: GeoJSON.FeatureCollection;
}

export interface SelectedCable {
  cable: CableFeature;
}
