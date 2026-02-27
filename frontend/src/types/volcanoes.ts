export interface Volcano {
  id: string;
  title: string;
  longitude: number;
  latitude: number;
  date: string | null;
  sourceUrl: string | null;
  country?: string;
}

export interface SelectedVolcano {
  volcano: Volcano;
}
