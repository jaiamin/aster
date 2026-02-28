import { darken, toKebab } from "@/lib/pin-icon";

describe("darken", () => {
  it("returns same color with amount 0", () => {
    expect(darken("#ffffff", 0)).toBe("#ffffff");
  });

  it("returns black with amount 1", () => {
    expect(darken("#ffffff", 1)).toBe("#000000");
  });

  it("darkens by 50%", () => {
    expect(darken("#ffffff", 0.5)).toBe("#808080");
  });

  it("handles non-white colors", () => {
    expect(darken("#ff0000", 0.5)).toBe("#800000");
  });

  it("handles already dark colors", () => {
    expect(darken("#000000", 0)).toBe("#000000");
    expect(darken("#000000", 1)).toBe("#000000");
  });

  it("handles mid-range amount", () => {
    const result = darken("#6e9ecf", 0.35);
    // Each channel: r=110, g=158, b=207 → * 0.65
    expect(result).toBe("#486787");
  });
});

describe("toKebab", () => {
  it('converts "strokeWidth" to "stroke-width"', () => {
    expect(toKebab("strokeWidth")).toBe("stroke-width");
  });

  it("does not change already lowercase strings", () => {
    expect(toKebab("stroke")).toBe("stroke");
  });

  it("handles multiple capitals", () => {
    expect(toKebab("strokeLineCap")).toBe("stroke-line-cap");
  });
});
