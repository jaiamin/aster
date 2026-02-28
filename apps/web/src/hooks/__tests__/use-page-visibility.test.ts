import { renderHook, act } from "@testing-library/react";

import { usePageVisibility } from "../use-page-visibility";

describe("usePageVisibility", () => {
  it("returns true when page is visible", () => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(true);
  });

  it("returns false when page is hidden", () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(false);
  });

  it("updates on visibilitychange event", () => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(true);
  });

  it("cleans up listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    const { unmount } = renderHook(() => usePageVisibility());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    removeSpy.mockRestore();
  });
});
