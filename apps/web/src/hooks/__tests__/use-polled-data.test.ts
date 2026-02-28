import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { usePolledData } from "../use-polled-data";

// Mock usePageVisibility to always return true
vi.mock("@/hooks/use-page-visibility", () => ({
  usePageVisibility: () => true,
}));

describe("usePolledData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches data from endpoint", async () => {
    const mockData = [{ id: 1, name: "test" }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => usePolledData({ endpoint: "/api/test" }));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("applies transform function", async () => {
    const rawData = { items: [1, 2, 3] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rawData),
    });

    const transform = (data: unknown) => (data as { items: number[] }).items.length;

    const { result } = renderHook(() => usePolledData({ endpoint: "/api/test", transform }));

    await waitFor(() => {
      expect(result.current.data).toBe(3);
    });
  });

  it("aborts fetch on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { unmount } = renderHook(() => usePolledData({ endpoint: "/api/test" }));

    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });

  it("sets error when fetch fails after all retries", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePolledData({ endpoint: "/api/test" }));

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 10000 },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe("Failed to fetch /api/test");
  });
});
