import {
  parseUrlState,
  writeUrlState,
  round,
  getInitialSearchQuery,
  getInitialViewState,
  getInitialLayers,
  getInitialStyle,
  getInitialTimeFilter,
} from "@/lib/url-state";
import { setLocationHash, spyOnReplaceState } from "@/test/helpers";

describe("round", () => {
  it("rounds zoom to 2 decimals", () => {
    expect(round(2.456789, 2)).toBe(2.46);
  });

  it("rounds lat/lng to 4 decimals", () => {
    expect(round(51.50735, 4)).toBe(51.5074);
  });

  it("rounds bearing/pitch to 1 decimal", () => {
    expect(round(45.678, 1)).toBe(45.7);
  });

  it("handles exact values without drift", () => {
    expect(round(1.0, 2)).toBe(1.0);
  });
});

describe("parseUrlState", () => {
  it("returns empty object for empty hash", () => {
    setLocationHash("");
    expect(parseUrlState()).toEqual({});
  });

  it("parses map coords", () => {
    setLocationHash("#map=5/51.5074/-0.1278");
    const result = parseUrlState();
    expect(result.viewState).toEqual({
      zoom: 5,
      latitude: 51.5074,
      longitude: -0.1278,
      bearing: 0,
      pitch: 0,
    });
  });

  it("parses map coords with bearing and pitch", () => {
    setLocationHash("#map=5/51.5074/-0.1278/30/45");
    const result = parseUrlState();
    expect(result.viewState?.bearing).toBe(30);
    expect(result.viewState?.pitch).toBe(45);
  });

  it("parses layers", () => {
    setLocationHash("#layers=earthquakes,volcanoes");
    const result = parseUrlState();
    expect(result.layers).toEqual(["earthquakes", "volcanoes"]);
  });

  it("parses style", () => {
    setLocationHash("#style=satellite");
    expect(parseUrlState().style).toBe("satellite");
  });

  it("ignores invalid style values", () => {
    setLocationHash("#style=invalid");
    expect(parseUrlState().style).toBeUndefined();
  });

  it("parses search query", () => {
    setLocationHash("#q=tokyo");
    expect(parseUrlState().searchQuery).toBe("tokyo");
  });

  it("parses time filter", () => {
    setLocationHash("#time=24h");
    expect(parseUrlState().timeFilter).toBe("24h");
  });

  it("ignores invalid time filter", () => {
    setLocationHash("#time=99z");
    expect(parseUrlState().timeFilter).toBeUndefined();
  });

  it("parses combined params", () => {
    setLocationHash("#map=3/20/0&layers=flights&style=satellite&q=test&time=7d");
    const result = parseUrlState();
    expect(result.viewState?.zoom).toBe(3);
    expect(result.layers).toEqual(["flights"]);
    expect(result.style).toBe("satellite");
    expect(result.searchQuery).toBe("test");
    expect(result.timeFilter).toBe("7d");
  });

  it("handles invalid map coords gracefully", () => {
    setLocationHash("#map=abc/def");
    expect(parseUrlState().viewState).toBeUndefined();
  });
});

describe("writeUrlState", () => {
  let replaceState: ReturnType<typeof spyOnReplaceState>;

  beforeEach(() => {
    replaceState = spyOnReplaceState();
    setLocationHash("");
  });

  afterEach(() => {
    replaceState.mockRestore();
  });

  const baseView = { zoom: 5, latitude: 51.5074, longitude: -0.1278, bearing: 0, pitch: 0 };

  it("writes basic view state", () => {
    writeUrlState(baseView, new Set(), "dark");
    expect(replaceState).toHaveBeenCalled();
    const hash = replaceState.mock.calls[0][2] as string;
    expect(hash).toContain("map=5%2F51.5074%2F-0.1278");
  });

  it("omits default bearing/pitch", () => {
    writeUrlState(baseView, new Set(), "dark");
    const hash = replaceState.mock.calls[0][2] as string;
    // Should only have zoom/lat/lng, not bearing/pitch
    const mapParam = new URLSearchParams(hash.slice(1)).get("map")!;
    expect(mapParam.split("/")).toHaveLength(3);
  });

  it("includes non-zero bearing/pitch", () => {
    writeUrlState({ ...baseView, bearing: 30, pitch: 45 }, new Set(), "dark");
    const hash = replaceState.mock.calls[0][2] as string;
    const mapParam = new URLSearchParams(hash.slice(1)).get("map")!;
    expect(mapParam.split("/")).toHaveLength(5);
  });

  it("sorts layers alphabetically", () => {
    writeUrlState(baseView, new Set(["volcanoes", "earthquakes"]), "dark");
    const hash = replaceState.mock.calls[0][2] as string;
    const layers = new URLSearchParams(hash.slice(1)).get("layers");
    expect(layers).toBe("earthquakes,volcanoes");
  });

  it('omits "dark" style', () => {
    writeUrlState(baseView, new Set(), "dark");
    const hash = replaceState.mock.calls[0][2] as string;
    expect(hash).not.toContain("style=");
  });

  it("includes satellite style", () => {
    writeUrlState(baseView, new Set(), "satellite");
    const hash = replaceState.mock.calls[0][2] as string;
    expect(hash).toContain("style=satellite");
  });

  it('omits "all" time filter', () => {
    writeUrlState(baseView, new Set(), "dark", undefined, "all");
    const hash = replaceState.mock.calls[0][2] as string;
    expect(hash).not.toContain("time=");
  });

  it("includes time filter preset", () => {
    writeUrlState(baseView, new Set(), "dark", undefined, "24h");
    const hash = replaceState.mock.calls[0][2] as string;
    expect(hash).toContain("time=24h");
  });
});

describe("getInitialSearchQuery", () => {
  it("returns empty string when no hash", () => {
    setLocationHash("");
    expect(getInitialSearchQuery()).toBe("");
  });

  it("returns search query from hash", () => {
    setLocationHash("#q=hello");
    expect(getInitialSearchQuery()).toBe("hello");
  });
});

describe("getInitialViewState", () => {
  it("returns INITIAL_VIEW_STATE when no hash", () => {
    setLocationHash("");
    const vs = getInitialViewState();
    expect(vs.latitude).toBe(20);
    expect(vs.longitude).toBe(0);
    expect(vs.zoom).toBe(2.5);
  });

  it("returns parsed view state from hash", () => {
    setLocationHash("#map=10/35/139");
    const vs = getInitialViewState();
    expect(vs.zoom).toBe(10);
    expect(vs.latitude).toBe(35);
  });
});

describe("getInitialLayers", () => {
  it("returns empty set when no hash", () => {
    setLocationHash("");
    expect(getInitialLayers().size).toBe(0);
  });

  it("returns layers from hash", () => {
    setLocationHash("#layers=earthquakes,flights");
    const layers = getInitialLayers();
    expect(layers.has("earthquakes")).toBe(true);
    expect(layers.has("flights")).toBe(true);
  });
});

describe("getInitialStyle", () => {
  it('returns "dark" by default', () => {
    setLocationHash("");
    expect(getInitialStyle()).toBe("dark");
  });

  it("returns satellite from hash", () => {
    setLocationHash("#style=satellite");
    expect(getInitialStyle()).toBe("satellite");
  });
});

describe("getInitialTimeFilter", () => {
  it('returns "all" by default', () => {
    setLocationHash("");
    expect(getInitialTimeFilter()).toBe("all");
  });

  it("returns time filter from hash", () => {
    setLocationHash("#time=6h");
    expect(getInitialTimeFilter()).toBe("6h");
  });
});
