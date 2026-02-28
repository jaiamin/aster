import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

type Bbox = [number, number, number, number];

interface ComputeMessage {
  type: "compute";
  requestId: number;
  points: { id: string | number; lng: number; lat: number }[];
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  bbox: Bbox | null;
}

self.onmessage = (e: MessageEvent<ComputeMessage>) => {
  const { requestId, points, polygon, bbox } = e.data;
  const ids: (string | number)[] = [];
  for (const p of points) {
    if (bbox && (p.lng < bbox[0] || p.lng > bbox[2] || p.lat < bbox[1] || p.lat > bbox[3]))
      continue;
    if (booleanPointInPolygon([p.lng, p.lat], polygon)) ids.push(p.id);
  }
  self.postMessage({ type: "result", requestId, ids });
};
