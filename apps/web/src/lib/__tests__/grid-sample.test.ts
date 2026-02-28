import { gridSample } from "@/lib/grid-sample";

interface Item {
  id: number;
  lng: number;
  lat: number;
  selected?: boolean;
}

const getLng = (item: Item) => item.lng;
const getLat = (item: Item) => item.lat;
const isSelected = (item: Item) => !!item.selected;

describe("gridSample", () => {
  it("returns all items when zoom >= threshold", () => {
    const items: Item[] = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      lng: i * 0.01,
      lat: i * 0.01,
    }));
    const result = gridSample(items, getLng, getLat, isSelected, 5, 5);
    expect(result).toEqual(items);
  });

  it("returns all items when count <= 500", () => {
    const items: Item[] = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      lng: i * 0.01,
      lat: i * 0.01,
    }));
    const result = gridSample(items, getLng, getLat, isSelected, 2, 5);
    expect(result).toEqual(items);
  });

  it("deduplicates items in the same grid cell at low zoom", () => {
    const items: Item[] = Array.from({ length: 600 }, (_, i) => ({
      id: i,
      lng: 10.5, // all in same cell
      lat: 20.5,
    }));
    const result = gridSample(items, getLng, getLat, isSelected, 2, 5, 2);
    expect(result).toHaveLength(1);
  });

  it("keeps items from different cells", () => {
    const items: Item[] = [
      { id: 0, lng: 0, lat: 0 },
      { id: 1, lng: 5, lat: 5 },
      { id: 2, lng: 10, lat: 10 },
      // pad to > 500
      ...Array.from({ length: 498 }, (_, i) => ({
        id: i + 3,
        lng: 100 + i * 3,
        lat: 0,
      })),
    ];
    const result = gridSample(items, getLng, getLat, isSelected, 2, 5, 2);
    // First 3 are in different cells, the rest spread across many cells
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("always preserves selected item", () => {
    const items: Item[] = [
      { id: 0, lng: 10.5, lat: 20.5 },
      { id: 1, lng: 10.5, lat: 20.5, selected: true }, // same cell as first
      ...Array.from({ length: 600 }, (_, i) => ({
        id: i + 2,
        lng: 10.5,
        lat: 20.5,
      })),
    ];
    const result = gridSample(items, getLng, getLat, isSelected, 2, 5, 2);
    expect(result.find((i) => i.selected)).toBeTruthy();
  });

  it("returns empty array for empty input", () => {
    expect(gridSample([], getLng, getLat, isSelected, 2)).toEqual([]);
  });

  it("respects custom threshold", () => {
    const items: Item[] = Array.from({ length: 600 }, (_, i) => ({
      id: i,
      lng: 10.5,
      lat: 20.5,
    }));
    // threshold=3, zoom=3 → zoom >= threshold, returns all
    expect(gridSample(items, getLng, getLat, isSelected, 3, 3)).toEqual(items);
  });

  it("respects custom cellSize", () => {
    const items: Item[] = [
      { id: 0, lng: 0, lat: 0 },
      { id: 1, lng: 0.5, lat: 0.5 },
      ...Array.from({ length: 600 }, (_, i) => ({
        id: i + 2,
        lng: 0,
        lat: 0,
      })),
    ];
    // cellSize=1: items at 0,0 and 0.5,0.5 are in same cell (floor(0/1)=0, floor(0.5/1)=0)
    const result = gridSample(items, getLng, getLat, isSelected, 2, 5, 1);
    expect(result).toHaveLength(1);
  });

  it("handles boundary at exactly 500 items", () => {
    const items: Item[] = Array.from({ length: 501 }, (_, i) => ({
      id: i,
      lng: 10.5,
      lat: 20.5,
    }));
    // 501 > 500 and zoom < threshold → sampling kicks in
    const result = gridSample(items, getLng, getLat, isSelected, 2, 5, 2);
    expect(result.length).toBeLessThan(501);
  });

  it("handles negative coordinates", () => {
    const items: Item[] = [
      { id: 0, lng: -10.5, lat: -20.5 },
      { id: 1, lng: -10.5, lat: -20.5 },
      ...Array.from({ length: 600 }, (_, i) => ({
        id: i + 2,
        lng: -10.5,
        lat: -20.5,
      })),
    ];
    const result = gridSample(items, getLng, getLat, isSelected, 2, 5, 2);
    expect(result).toHaveLength(1);
  });
});
