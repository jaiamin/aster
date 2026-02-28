import { MODULE_REGISTRY, CATEGORY_ORDER } from "@/modules/registry";

describe("MODULE_REGISTRY", () => {
  it("has no duplicate module IDs", () => {
    const ids = MODULE_REGISTRY.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every module has required fields", () => {
    for (const m of MODULE_REGISTRY) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.category).toBeTruthy();
      expect(m.icon).toBeTruthy();
      expect(typeof m.focusZoom).toBe("number");
      expect(m.MapLayer).toBeTruthy();
    }
  });

  it("categories match expected set", () => {
    const categories = new Set(MODULE_REGISTRY.map((m) => m.category));
    for (const cat of categories) {
      expect(CATEGORY_ORDER).toContain(cat);
    }
  });

  it("filter fields have valid types and required key/label", () => {
    const validTypes = ["range", "enum", "boolean", "text"];
    for (const m of MODULE_REGISTRY) {
      if (!m.filters) continue;
      for (const f of m.filters) {
        expect(f.key).toBeTruthy();
        expect(f.label).toBeTruthy();
        expect(validTypes).toContain(f.type);
      }
    }
  });

  it("has at least 10 modules registered", () => {
    expect(MODULE_REGISTRY.length).toBeGreaterThanOrEqual(10);
  });
});
