import { getProjectionMode, zoomToAltitude } from "@/hooks/use-map-state";

describe("getProjectionMode", () => {
  it('returns "globe" below start threshold', () => {
    expect(getProjectionMode(3)).toBe("globe");
    expect(getProjectionMode(6.9)).toBe("globe");
  });

  it('returns "mercator" above end threshold', () => {
    expect(getProjectionMode(13)).toBe("mercator");
    expect(getProjectionMode(20)).toBe("mercator");
  });

  it('returns "transitioning" between thresholds', () => {
    expect(getProjectionMode(7)).toBe("transitioning");
    expect(getProjectionMode(10)).toBe("transitioning");
    expect(getProjectionMode(12)).toBe("transitioning");
  });
});

describe("zoomToAltitude", () => {
  it("returns ~40075 at zoom 0", () => {
    expect(zoomToAltitude(0)).toBe(40075);
  });

  it("returns ~39 at zoom 10", () => {
    expect(zoomToAltitude(10)).toBe(39);
  });

  it("returns an integer", () => {
    expect(Number.isInteger(zoomToAltitude(5.5))).toBe(true);
  });
});
