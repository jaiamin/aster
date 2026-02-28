import { describe, it, expect } from "vitest";

// Test the filter matching logic that useExplorerFilters implements
// These are pure function tests for the filter predicate patterns

type FilterValue =
  | { type: "range"; min: number; max: number }
  | { type: "enum"; selected: Set<string> }
  | { type: "boolean"; value: boolean }
  | { type: "text"; value: string };

function matchesFilter(item: Record<string, unknown>, key: string, filter: FilterValue): boolean {
  const val = item[key];
  switch (filter.type) {
    case "range": {
      if (typeof val !== "number") return true;
      return val >= filter.min && val <= filter.max;
    }
    case "enum": {
      if (filter.selected.size === 0) return true;
      return filter.selected.has(String(val ?? ""));
    }
    case "boolean": {
      return Boolean(val) === filter.value;
    }
    case "text": {
      if (!filter.value) return true;
      return String(val ?? "")
        .toLowerCase()
        .includes(filter.value.toLowerCase());
    }
  }
}

describe("filter matching logic", () => {
  describe("range filter", () => {
    const filter: FilterValue = { type: "range", min: 2.0, max: 6.0 };

    it("includes items within range", () => {
      expect(matchesFilter({ magnitude: 3.5 }, "magnitude", filter)).toBe(true);
    });

    it("includes items at range boundaries", () => {
      expect(matchesFilter({ magnitude: 2.0 }, "magnitude", filter)).toBe(true);
      expect(matchesFilter({ magnitude: 6.0 }, "magnitude", filter)).toBe(true);
    });

    it("excludes items outside range", () => {
      expect(matchesFilter({ magnitude: 1.5 }, "magnitude", filter)).toBe(false);
      expect(matchesFilter({ magnitude: 7.0 }, "magnitude", filter)).toBe(false);
    });

    it("passes non-numeric values through", () => {
      expect(matchesFilter({ magnitude: null }, "magnitude", filter)).toBe(true);
      expect(matchesFilter({ magnitude: "N/A" }, "magnitude", filter)).toBe(true);
    });
  });

  describe("enum filter", () => {
    const filter: FilterValue = {
      type: "enum",
      selected: new Set(["Solar", "Wind"]),
    };

    it("includes items matching selected values", () => {
      expect(matchesFilter({ fuelType: "Solar" }, "fuelType", filter)).toBe(true);
      expect(matchesFilter({ fuelType: "Wind" }, "fuelType", filter)).toBe(true);
    });

    it("excludes items not in selected values", () => {
      expect(matchesFilter({ fuelType: "Coal" }, "fuelType", filter)).toBe(false);
    });

    it("passes all items when no selection", () => {
      const emptyFilter: FilterValue = { type: "enum", selected: new Set() };
      expect(matchesFilter({ fuelType: "Coal" }, "fuelType", emptyFilter)).toBe(true);
    });
  });

  describe("boolean filter", () => {
    it("matches truthy values", () => {
      const filter: FilterValue = { type: "boolean", value: true };
      expect(matchesFilter({ tsunami: true }, "tsunami", filter)).toBe(true);
      expect(matchesFilter({ tsunami: false }, "tsunami", filter)).toBe(false);
    });

    it("matches falsy values", () => {
      const filter: FilterValue = { type: "boolean", value: false };
      expect(matchesFilter({ tsunami: false }, "tsunami", filter)).toBe(true);
      expect(matchesFilter({ tsunami: true }, "tsunami", filter)).toBe(false);
    });
  });

  describe("text filter", () => {
    const filter: FilterValue = { type: "text", value: "tokyo" };

    it("matches case-insensitively", () => {
      expect(matchesFilter({ place: "Tokyo Bay" }, "place", filter)).toBe(true);
      expect(matchesFilter({ place: "TOKYO" }, "place", filter)).toBe(true);
    });

    it("excludes non-matching items", () => {
      expect(matchesFilter({ place: "New York" }, "place", filter)).toBe(false);
    });

    it("passes all items when filter is empty", () => {
      const emptyFilter: FilterValue = { type: "text", value: "" };
      expect(matchesFilter({ place: "Anywhere" }, "place", emptyFilter)).toBe(true);
    });
  });
});
