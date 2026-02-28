import { renderHook, waitFor } from "@testing-library/react";

import { useReverseGeocode } from "../use-reverse-geocode";

describe("useReverseGeocode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches from Nominatim and returns extracted location", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          address: { city: "Tokyo", country_code: "jp" },
        }),
    });

    const { result } = renderHook(() => useReverseGeocode(35.6762, 139.6503));

    await waitFor(() => {
      expect(result.current).toBe("Tokyo, JP");
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/reverse"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns cached value immediately on second call", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          address: { city: "London", country_code: "gb" },
        }),
    });

    // First call
    const { result: r1 } = renderHook(() => useReverseGeocode(51.507, -0.128));
    await waitFor(() => {
      expect(r1.current).toBe("London, GB");
    });

    // Same coords (rounded to 3dp) → should use cache, no new fetch
    const fetchCount = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    const { result: r2 } = renderHook(() => useReverseGeocode(51.507, -0.128));

    // Should have cached result immediately
    await waitFor(() => {
      expect(r2.current).toBe("London, GB");
    });
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCount);
  });

  it("falls back to oceanName on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useReverseGeocode(70, 0));

    await waitFor(() => {
      expect(result.current).toBe("Arctic Ocean");
    });
  });

  it("aborts on unmount", () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves

    // Use unique coords to avoid cache hit
    const { unmount } = renderHook(() => useReverseGeocode(12.345, 67.891));
    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
