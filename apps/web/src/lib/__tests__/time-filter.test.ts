import { getFilterCutoff, filterByTime } from "@/lib/time-filter";

describe("getFilterCutoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = new Date("2025-06-15T12:00:00Z").getTime();

  it('returns null for "all"', () => {
    expect(getFilterCutoff("all")).toBeNull();
  });

  it("returns cutoff for 1h", () => {
    expect(getFilterCutoff("1h")).toBe(now - 3_600_000);
  });

  it("returns cutoff for 6h", () => {
    expect(getFilterCutoff("6h")).toBe(now - 6 * 3_600_000);
  });

  it("returns cutoff for 24h", () => {
    expect(getFilterCutoff("24h")).toBe(now - 24 * 3_600_000);
  });

  it("returns cutoff for 3d", () => {
    expect(getFilterCutoff("3d")).toBe(now - 3 * 86_400_000);
  });

  it("returns cutoff for 7d", () => {
    expect(getFilterCutoff("7d")).toBe(now - 7 * 86_400_000);
  });

  it("returns cutoff for 30d", () => {
    expect(getFilterCutoff("30d")).toBe(now - 30 * 86_400_000);
  });
});

describe("filterByTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = new Date("2025-06-15T12:00:00Z").getTime();

  it('returns all items for "all" preset', () => {
    const items = [{ time: 0 }, { time: now }];
    expect(filterByTime(items, "earthquakes", "all")).toEqual(items);
  });

  it("returns empty array for empty input", () => {
    expect(filterByTime([], "earthquakes", "1h")).toEqual([]);
  });

  // earthquakes: numeric `time`
  it("filters earthquakes by numeric time", () => {
    const items = [
      { time: now - 1000 }, // recent
      { time: now - 7_200_000 }, // 2h ago
    ];
    const result = filterByTime(items, "earthquakes", "1h");
    expect(result).toEqual([{ time: now - 1000 }]);
  });

  // wildfires: acqDate + acqTime
  it("filters wildfires by acqDate + acqTime", () => {
    const items = [
      { acqDate: "2025-06-15", acqTime: "1130" }, // 11:30 UTC, within 1h of noon UTC
      { acqDate: "2025-06-14", acqTime: "0900" }, // yesterday, well outside 1h
    ];
    const result = filterByTime(items, "wildfires", "1h");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ acqDate: "2025-06-15", acqTime: "1130" });
  });

  // storms: lastUpdated ISO string
  it("filters storms by lastUpdated", () => {
    const items = [
      { lastUpdated: "2025-06-15T11:30:00Z" }, // 30min ago
      { lastUpdated: "2025-06-14T12:00:00Z" }, // 1 day ago
    ];
    const result = filterByTime(items, "storms", "1h");
    expect(result).toHaveLength(1);
  });

  // buoys: time string
  it("filters buoys by time string", () => {
    const items = [{ time: "2025-06-15T11:30:00Z" }, { time: "2025-06-10T12:00:00Z" }];
    const result = filterByTime(items, "buoys", "24h");
    expect(result).toHaveLength(1);
  });

  // air-quality: lastUpdated
  it("filters air-quality by lastUpdated", () => {
    const items = [
      { lastUpdated: "2025-06-15T11:00:00Z" },
      { lastUpdated: "2025-06-01T12:00:00Z" },
    ];
    const result = filterByTime(items, "air-quality", "7d");
    expect(result).toHaveLength(1);
  });

  // volcanoes: date
  it("filters volcanoes by date string", () => {
    const items = [{ date: "2025-06-15T10:00:00Z" }, { date: "2025-01-01T00:00:00Z" }];
    const result = filterByTime(items, "volcanoes", "30d");
    expect(result).toHaveLength(1);
  });

  // launches: net, future launches pass through
  it("filters launches by net and passes through future launches", () => {
    const items = [
      { net: "2025-06-15T11:00:00Z" }, // 1h ago
      { net: "2025-06-10T12:00:00Z" }, // 5 days ago
      { net: "2025-07-01T00:00:00Z" }, // future
    ];
    const result = filterByTime(items, "launches", "1h");
    expect(result).toHaveLength(2); // recent + future
  });

  // unknown module returns all items
  it("returns all items for unknown module", () => {
    const items = [{ time: 0 }, { time: now }];
    expect(filterByTime(items, "unknown-module", "1h")).toEqual(items);
  });

  // null/invalid dates keep items
  it("keeps items with null/invalid time fields", () => {
    const items = [{ time: null }, { time: "not-a-date" }, { time: now - 1000 }];
    const result = filterByTime(items, "earthquakes", "1h");
    // null time → null → kept, "not-a-date" → not number → null → kept, recent → kept
    expect(result).toHaveLength(3);
  });
});
