import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();
const fakeWindow = {
  location: { pathname: "/sales/leads" },
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  },
};

describe("CRM GET cache", () => {
  beforeEach(async () => {
    vi.stubGlobal("window", fakeWindow);
    memory.clear();
    const { invalidateCrmGetCache } = await import("@/lib/crm/get-cache");
    invalidateCrmGetCache();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shares one request between identical GETs and serves repeats from memory", async () => {
    const { cachedCrmGet } = await import("@/lib/crm/get-cache");
    const load = vi.fn(async () => ({ rows: [1, 2] }));
    const [a, b] = await Promise.all([
      cachedCrmGet("bff", "/v1/leads", load),
      cachedCrmGet("bff", "/v1/leads", load),
    ]);
    const c = await cachedCrmGet("bff", "/v1/leads", load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ rows: [1, 2] });
    // Each caller gets its own copy to mutate.
    a.rows.push(3);
    expect(b.rows).toEqual([1, 2]);
    expect(c.rows).toEqual([1, 2]);
  });

  it("refetches once the answer is a minute old", async () => {
    vi.useFakeTimers();
    const { cachedCrmGet } = await import("@/lib/crm/get-cache");
    const load = vi.fn(async () => "x");
    await cachedCrmGet("bff", "/v1/deals", load);
    vi.advanceTimersByTime(61_000);
    await cachedCrmGet("bff", "/v1/deals", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not keep a failed request", async () => {
    const { cachedCrmGet } = await import("@/lib/crm/get-cache");
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("ok");
    await expect(cachedCrmGet("bff", "/v1/tasks", load)).rejects.toThrow("offline");
    await expect(cachedCrmGet("bff", "/v1/tasks", load)).resolves.toBe("ok");
  });

  it("is cleared by a write so the next read is fresh", async () => {
    const { cachedCrmGet, invalidateCrmGetCache } = await import("@/lib/crm/get-cache");
    const load = vi.fn(async () => "x");
    await cachedCrmGet("bff", "/v1/notes", load);
    invalidateCrmGetCache();
    await cachedCrmGet("bff", "/v1/notes", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never caches on the server, where one process serves many users", async () => {
    vi.unstubAllGlobals();
    const { cachedCrmGet } = await import("@/lib/crm/get-cache");
    const load = vi.fn(async () => "x");
    await cachedCrmGet("bff", "/v1/leads", load);
    await cachedCrmGet("bff", "/v1/leads", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("only caches plain GETs", async () => {
    const { isCacheableGet } = await import("@/lib/crm/get-cache");
    expect(isCacheableGet()).toBe(true);
    expect(isCacheableGet({ method: "get" })).toBe(true);
    expect(isCacheableGet({ method: "POST" })).toBe(false);
    expect(isCacheableGet({ cache: "no-store" })).toBe(false);
  });
});

describe("route prefetch rules", () => {
  const WS = "5e481fb1-b1f9-4272-bc92-01a195c8a094";

  it("learns list pages, not pages about one record", async () => {
    const { routeKey } = await import("@/lib/crm/route-prefetch");
    expect(routeKey("/sales/leads/")).toBe("/sales/leads");
    expect(routeKey("/sales/leads/8d0e3d8e-0c55-4d4f-9a0e-1b2c3d4e5f60")).toBeNull();
    expect(routeKey("/finance/invoices/42")).toBeNull();
  });

  it("only replays workspace-wide requests that are not searches", async () => {
    const { isPrefetchablePath } = await import("@/lib/crm/route-prefetch");
    expect(isPrefetchablePath(`/v1/workspaces/${WS}/leads?page=1`, WS)).toBe(true);
    expect(isPrefetchablePath(`/v1/leads?page=1&search=ada`, WS)).toBe(false);
    expect(
      isPrefetchablePath(`/v1/workspaces/${WS}/leads/8d0e3d8e-0c55-4d4f-9a0e-1b2c3d4e5f60`, WS),
    ).toBe(false);
    expect(isPrefetchablePath("/api/other", WS)).toBe(false);
  });

  it("prefetches what a page loaded last time when its link is hovered", async () => {
    vi.stubGlobal("window", fakeWindow);
    memory.clear();
    const cache = await import("@/lib/crm/get-cache");
    cache.invalidateCrmGetCache();
    const { startRoutePrefetch } = await import("@/lib/crm/route-prefetch");
    const run = vi.fn(async () => "warm");
    const prefetcher = startRoutePrefetch({ workspaceId: () => WS, run });

    // Visiting /sales/leads records its requests...
    fakeWindow.location.pathname = "/sales/leads";
    await cache.cachedCrmGet("bff", `/v1/workspaces/${WS}/leads?page=1`, async () => []);
    await cache.cachedCrmGet("bff", "/v1/leads?search=ada", async () => []);
    cache.invalidateCrmGetCache();

    // ...and hovering a link to it later replays the safe ones.
    fakeWindow.location.pathname = "/dashboard";
    prefetcher.prefetch("/sales/leads");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith("bff", `/v1/workspaces/${WS}/leads?page=1`);
    expect(prefetcher.recentRoutes(3, "/dashboard")).toEqual(["/sales/leads"]);

    // Hovering again right away does not refetch.
    prefetcher.prefetch("/sales/leads");
    expect(run).toHaveBeenCalledTimes(1);
    prefetcher.stop();
    vi.unstubAllGlobals();
  });
});
