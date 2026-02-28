import { matchesFilter, type FilterValue } from "@/modules/explorer-context";
import type { FilterField } from "@/types/modules";

const rangeField: FilterField = {
  key: "magnitude",
  label: "Magnitude",
  type: "range",
  min: 0,
  max: 10,
};
const enumField: FilterField = { key: "fuelType", label: "Fuel Type", type: "enum" };
const boolField: FilterField = { key: "tsunami", label: "Tsunami", type: "boolean" };
const textField: FilterField = { key: "place", label: "Place", type: "text" };

describe("matchesFilter — range", () => {
  const filter: FilterValue = { type: "range", min: 2.0, max: 6.0 };

  it("includes items within range", () => {
    expect(matchesFilter({ magnitude: 3.5 }, rangeField, filter)).toBe(true);
  });

  it("includes items at boundaries", () => {
    expect(matchesFilter({ magnitude: 2.0 }, rangeField, filter)).toBe(true);
    expect(matchesFilter({ magnitude: 6.0 }, rangeField, filter)).toBe(true);
  });

  it("excludes items outside range", () => {
    expect(matchesFilter({ magnitude: 1.5 }, rangeField, filter)).toBe(false);
    expect(matchesFilter({ magnitude: 7.0 }, rangeField, filter)).toBe(false);
  });

  it("parses string numbers", () => {
    expect(matchesFilter({ magnitude: "3.5" }, rangeField, filter)).toBe(true);
  });

  it("returns false for NaN (differs from old inline test)", () => {
    expect(matchesFilter({ magnitude: null }, rangeField, filter)).toBe(false);
    expect(matchesFilter({ magnitude: "N/A" }, rangeField, filter)).toBe(false);
  });
});

describe("matchesFilter — enum", () => {
  const filter: FilterValue = { type: "enum", selected: new Set(["Solar", "Wind"]) };

  it("includes matching items", () => {
    expect(matchesFilter({ fuelType: "Solar" }, enumField, filter)).toBe(true);
    expect(matchesFilter({ fuelType: "Wind" }, enumField, filter)).toBe(true);
  });

  it("excludes non-matching items", () => {
    expect(matchesFilter({ fuelType: "Coal" }, enumField, filter)).toBe(false);
  });

  it("passes all when selected set is empty", () => {
    const emptyFilter: FilterValue = { type: "enum", selected: new Set() };
    expect(matchesFilter({ fuelType: "Coal" }, enumField, emptyFilter)).toBe(true);
  });

  it("converts non-string values to string", () => {
    expect(matchesFilter({ fuelType: undefined }, enumField, filter)).toBe(false);
  });
});

describe("matchesFilter — boolean", () => {
  it("matches truthy values", () => {
    const filter: FilterValue = { type: "boolean", value: true };
    expect(matchesFilter({ tsunami: true }, boolField, filter)).toBe(true);
    expect(matchesFilter({ tsunami: false }, boolField, filter)).toBe(false);
    expect(matchesFilter({ tsunami: 0 }, boolField, filter)).toBe(false);
  });

  it("matches falsy values", () => {
    const filter: FilterValue = { type: "boolean", value: false };
    expect(matchesFilter({ tsunami: false }, boolField, filter)).toBe(true);
    expect(matchesFilter({ tsunami: true }, boolField, filter)).toBe(false);
  });
});

describe("matchesFilter — text", () => {
  const filter: FilterValue = { type: "text", value: "tokyo" };

  it("matches case-insensitively", () => {
    expect(matchesFilter({ place: "Tokyo Bay" }, textField, filter)).toBe(true);
    expect(matchesFilter({ place: "TOKYO" }, textField, filter)).toBe(true);
    expect(matchesFilter({ place: "Near tokyo" }, textField, filter)).toBe(true);
  });

  it("excludes non-matching items", () => {
    expect(matchesFilter({ place: "New York" }, textField, filter)).toBe(false);
  });

  it("passes all when filter value is empty", () => {
    const emptyFilter: FilterValue = { type: "text", value: "" };
    expect(matchesFilter({ place: "Anywhere" }, textField, emptyFilter)).toBe(true);
  });

  it("handles null/undefined raw values", () => {
    expect(matchesFilter({ place: null }, textField, filter)).toBe(false);
    expect(matchesFilter({ place: undefined }, textField, filter)).toBe(false);
  });
});
