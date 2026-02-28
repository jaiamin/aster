import { oceanName, extractLocation, cacheKey, computeBbox } from "@/lib/geo";

describe("oceanName", () => {
  it("returns Arctic Ocean for high latitude", () => {
    expect(oceanName(70, 0)).toBe("Arctic Ocean");
  });

  it("returns Southern Ocean for low latitude", () => {
    expect(oceanName(-65, 0)).toBe("Southern Ocean");
  });

  it("returns Indian Ocean for correct region", () => {
    expect(oceanName(10, 80)).toBe("Indian Ocean");
    expect(oceanName(20, 60)).toBe("Indian Ocean");
  });

  it("returns North Atlantic for correct region", () => {
    expect(oceanName(30, -40)).toBe("North Atlantic");
  });

  it("returns South Atlantic for correct region", () => {
    expect(oceanName(-30, -40)).toBe("South Atlantic");
  });

  it("returns North Pacific for northern latitudes outside Atlantic/Indian", () => {
    expect(oceanName(30, 150)).toBe("North Pacific");
    expect(oceanName(30, -150)).toBe("North Pacific");
  });

  it("returns South Pacific for southern latitudes outside Atlantic/Indian", () => {
    expect(oceanName(-30, 150)).toBe("South Pacific");
  });

  it("normalizes longitude > 180", () => {
    // 200 → normalized to -160, which is Pacific
    expect(oceanName(10, 200)).toBe("North Pacific");
  });

  it("normalizes longitude < -180", () => {
    // -200 → normalized to 160, above 120 and lat > 30 → Pacific
    expect(oceanName(40, -200)).toBe("North Pacific");
  });
});

describe("extractLocation", () => {
  it("returns city, code when both available", () => {
    expect(extractLocation({ city: "Tokyo", country_code: "jp" }, 35, 139)).toBe("Tokyo, JP");
  });

  it("falls back to town when no city", () => {
    expect(extractLocation({ town: "Greenwich", country_code: "gb" }, 51, 0)).toBe("Greenwich, GB");
  });

  it("uses city + country when no country_code", () => {
    expect(extractLocation({ city: "Paris", country: "France" }, 48, 2)).toBe("Paris, France");
  });

  it("returns state + code when no city-like field", () => {
    expect(extractLocation({ state: "California", country_code: "us" }, 36, -119)).toBe(
      "California, US",
    );
  });

  it("returns country only as last resort", () => {
    expect(extractLocation({ country: "Japan" }, 35, 139)).toBe("Japan");
  });

  it("falls back to ocean when no address", () => {
    expect(extractLocation(undefined, 35, 139)).toBe("North Pacific");
  });

  it("falls back to ocean when address has no useful fields", () => {
    expect(extractLocation({}, 35, 139)).toBe("North Pacific");
  });

  it("follows priority chain city > town > village > hamlet > municipality > county", () => {
    expect(
      extractLocation(
        { village: "V", hamlet: "H", municipality: "M", county: "C", country_code: "us" },
        0,
        0,
      ),
    ).toBe("V, US");

    expect(
      extractLocation({ hamlet: "H", municipality: "M", county: "C", country_code: "us" }, 0, 0),
    ).toBe("H, US");

    expect(extractLocation({ municipality: "M", county: "C", country_code: "us" }, 0, 0)).toBe(
      "M, US",
    );

    expect(extractLocation({ county: "C", country_code: "us" }, 0, 0)).toBe("C, US");
  });
});

describe("cacheKey", () => {
  it("rounds to 3 decimal places", () => {
    expect(cacheKey(51.507351, -0.127758)).toBe("51.507,-0.128");
  });

  it("handles exact values", () => {
    expect(cacheKey(0, 0)).toBe("0.000,0.000");
  });
});

describe("computeBbox", () => {
  it("handles Point geometry", () => {
    const bbox = computeBbox({
      type: "Point",
      coordinates: [10, 20],
    });
    expect(bbox).toEqual([10, 20, 10, 20]);
  });

  it("handles Polygon geometry", () => {
    const bbox = computeBbox({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    });
    expect(bbox).toEqual([0, 0, 10, 10]);
  });

  it("handles MultiPolygon geometry", () => {
    const bbox = computeBbox({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [5, 5],
            [0, 5],
            [0, 0],
          ],
        ],
        [
          [
            [10, 10],
            [20, 20],
            [10, 20],
            [10, 10],
          ],
        ],
      ],
    });
    expect(bbox).toEqual([0, 0, 20, 20]);
  });

  it("handles nested coordinates", () => {
    const bbox = computeBbox({
      type: "Polygon",
      coordinates: [
        [
          [-10, -5],
          [10, 15],
          [-10, -5],
        ],
      ],
    });
    expect(bbox).toEqual([-10, -5, 10, 15]);
  });
});
