import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PublicBookingError,
  bookPublicSlot,
  fetchPublicSlots,
  fetchPublishedCrmRef,
  managePublicBooking,
} from "@/lib/booking/public-client";

function stubFetch(status: number, body: unknown) {
  const fn = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPublicSlots", () => {
  it("asks the page's own slots route and groups the answer by day", async () => {
    const fetchMock = stubFetch(200, {
      days: [{ date: "2026-10-05", slots: [{ startAt: "2026-10-05T04:30:00.000Z", hostId: "h1" }] }],
    });

    const res = await fetchPublicSlots("ram test", {
      from: "2026-10-01",
      to: "2026-10-31",
      timezone: "Asia/Kathmandu",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.days.get("2026-10-05")).toEqual([
        { startAt: "2026-10-05T04:30:00.000Z", hostId: "h1" },
      ]);
    }
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "/api/book/ram%20test/slots?from=2026-10-01&to=2026-10-31&timezone=Asia%2FKathmandu",
    );
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("omits the timezone when there is none", async () => {
    const fetchMock = stubFetch(200, { days: [] });
    await fetchPublicSlots("p", { from: "2026-10-01", to: "2026-10-02" });
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/book/p/slots?from=2026-10-01&to=2026-10-02");
  });

  it("reports the route's code and guest-safe message", async () => {
    stubFetch(429, { error: "Too many requests. Please try again in a minute.", code: "rate_limited" });
    expect(await fetchPublicSlots("p", { from: "2026-10-01", to: "2026-10-02" })).toEqual({
      ok: false,
      code: "rate_limited",
      message: "Too many requests. Please try again in a minute.",
    });
  });

  it("treats an unknown code or a non-JSON failure as unavailable", async () => {
    stubFetch(500, { error: "x", code: "something_new" });
    expect(await fetchPublicSlots("p", { from: "a", to: "b" })).toMatchObject({
      ok: false,
      code: "unavailable",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 502 })));
    expect(await fetchPublicSlots("p", { from: "a", to: "b" })).toMatchObject({
      ok: false,
      code: "unavailable",
      message: expect.stringMatching(/unavailable/i),
    });
  });

  it("does not throw when the network is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    expect(await fetchPublicSlots("p", { from: "a", to: "b" })).toMatchObject({
      ok: false,
      code: "unavailable",
    });
  });
});

describe("bookPublicSlot", () => {
  const input = {
    startAt: "2026-10-05T04:30:00.000Z",
    name: "Sita",
    email: "sita@example.com",
  };

  it("posts the booking and returns the ids and tokens", async () => {
    const fetchMock = stubFetch(200, {
      bookingId: "b1",
      startAt: input.startAt,
      hostName: "Mohit",
      cancelToken: "c-token-1",
      rescheduleToken: "r-token-1",
    });

    expect(await bookPublicSlot("ram-test", input)).toEqual({
      ok: true,
      bookingId: "b1",
      startAt: input.startAt,
      hostName: "Mohit",
      cancelToken: "c-token-1",
      rescheduleToken: "r-token-1",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/book/ram-test/book");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual(input);
  });

  it("surfaces a taken slot by code", async () => {
    stubFetch(409, { error: "That time was just booked. Please choose another time.", code: "slot_unavailable" });
    expect(await bookPublicSlot("ram-test", input)).toEqual({
      ok: false,
      code: "slot_unavailable",
      message: "That time was just booked. Please choose another time.",
    });
  });

  it("does not call a reply without a booking id a success", async () => {
    stubFetch(200, {});
    expect(await bookPublicSlot("ram-test", input)).toMatchObject({ ok: false, code: "unavailable" });
  });

  it("reports an unconnected page so the caller can fall back", async () => {
    stubFetch(404, { error: "This page is not connected to the CRM", code: "not_connected" });
    expect(await bookPublicSlot("ram-test", input)).toMatchObject({ ok: false, code: "not_connected" });
  });
});

describe("managePublicBooking", () => {
  it("cancels", async () => {
    const fetchMock = stubFetch(200, { bookingId: "b1", status: "CANCELLED" });
    expect(
      await managePublicBooking("ram-test", { action: "cancel", token: "c-token-1" }),
    ).toMatchObject({ ok: true, bookingId: "b1", status: "CANCELLED" });
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/book/ram-test/manage");
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      action: "cancel",
      token: "c-token-1",
    });
  });

  it("reschedules and returns the replacement's tokens", async () => {
    stubFetch(200, { bookingId: "b2", cancelToken: "c2", rescheduleToken: "r2" });
    expect(
      await managePublicBooking("ram-test", {
        action: "reschedule",
        token: "r-token-1",
        startAt: "2026-10-06T05:00:00.000Z",
      }),
    ).toEqual({
      ok: true,
      bookingId: "b2",
      status: undefined,
      startAt: undefined,
      cancelToken: "c2",
      rescheduleToken: "r2",
    });
  });
});

describe("fetchPublishedCrmRef", () => {
  const ref = { workspaceSlug: "acme", hostSlug: "mohit", eventTypeSlug: "ram-test" };

  it("reads the address the host published", async () => {
    const fetchMock = stubFetch(200, { slug: "ram-test", crmPublic: ref });
    expect(await fetchPublishedCrmRef("ram-test")).toEqual(ref);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/book/ram-test");
  });

  it.each([
    ["the page was not published", 404, { error: "Not found" }],
    ["it was published without an address", 200, { slug: "ram-test" }],
    ["the address is malformed", 200, { crmPublic: { ...ref, hostSlug: "a/b" } }],
  ])("returns null when %s", async (_label, status, body) => {
    stubFetch(status, body);
    expect(await fetchPublishedCrmRef("ram-test")).toBeNull();
  });

  it("returns null instead of throwing when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect(await fetchPublishedCrmRef("ram-test")).toBeNull();
  });
});

describe("PublicBookingError", () => {
  it("carries the code the page switches on", () => {
    const error = new PublicBookingError("slot_unavailable", "taken");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("slot_unavailable");
    expect(error.message).toBe("taken");
    expect(error.name).toBe("PublicBookingError");
  });
});
