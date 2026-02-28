import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  ModuleProvider,
  useModuleToggle,
  useModuleSelection,
  useModuleFilter,
} from "@/modules/module-context";

// Mock url-state to avoid hash dependency
vi.mock("@/lib/url-state", () => ({
  getInitialLayers: () => new Set<string>(),
  getInitialSearchQuery: () => "",
  getInitialTimeFilter: () => "all" as const,
  parseUrlState: () => ({}),
  writeUrlState: () => {},
  getInitialViewState: () => ({
    latitude: 20,
    longitude: 0,
    zoom: 2.5,
    bearing: 0,
    pitch: 0,
  }),
  getInitialStyle: () => "dark",
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <ModuleProvider>{children}</ModuleProvider>
);

describe("useModuleToggle", () => {
  it("starts with no enabled modules", () => {
    const { result } = renderHook(() => useModuleToggle(), { wrapper });
    expect(result.current.enabledModules.size).toBe(0);
  });

  it("toggle adds a module", () => {
    const { result } = renderHook(() => useModuleToggle(), { wrapper });
    act(() => result.current.toggle("earthquakes"));
    expect(result.current.enabledModules.has("earthquakes")).toBe(true);
  });

  it("toggle removes a module", () => {
    const { result } = renderHook(() => useModuleToggle(), { wrapper });
    act(() => result.current.toggle("earthquakes"));
    act(() => result.current.toggle("earthquakes"));
    expect(result.current.enabledModules.has("earthquakes")).toBe(false);
  });
});

describe("useModuleSelection", () => {
  it("notifySelected deselects other modules", () => {
    const deselectA = vi.fn();
    const deselectB = vi.fn();

    const { result } = renderHook(() => useModuleSelection(), { wrapper });

    act(() => {
      result.current.registerDeselect("a", deselectA);
      result.current.registerDeselect("b", deselectB);
    });

    act(() => result.current.notifySelected("a"));

    expect(deselectA).not.toHaveBeenCalled();
    expect(deselectB).toHaveBeenCalledOnce();
  });
});

describe("useModuleFilter", () => {
  it("starts with default search query and time filter", () => {
    const { result } = renderHook(() => useModuleFilter(), { wrapper });
    expect(result.current.searchQuery).toBe("");
    expect(result.current.timeFilter).toBe("all");
  });

  it("updates search query", () => {
    const { result } = renderHook(() => useModuleFilter(), { wrapper });
    act(() => result.current.setSearchQuery("tokyo"));
    expect(result.current.searchQuery).toBe("tokyo");
  });

  it("updates time filter", () => {
    const { result } = renderHook(() => useModuleFilter(), { wrapper });
    act(() => result.current.setTimeFilter("24h"));
    expect(result.current.timeFilter).toBe("24h");
  });
});
