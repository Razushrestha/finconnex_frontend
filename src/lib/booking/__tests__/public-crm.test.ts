import { afterEach, describe, expect, it, vi } from "vitest";
import {
  callPublicCrm,
  isIsoDate,
  parseCrmPublicRef,
  parsePublicSlotDays,
  publicBookingPath,
  publicManagePath,
  timeInZone,
} from "@/lib/booking/public-crm";

const ref = { workspaceSlug: "acme", hostSlug: "mohit", eventTypeSlug: "ram-test" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseCrmPublicRef", () => {
  it("accepts three plain slugs", () => {
    expect(parseCrmPublicRef(ref)).toEqual(ref);
    expect(parseCrmPublicRef({ ...ref, hostSlug: " Mohit_2 " })).toEqual({
      ...ref,
      hostSlug: "Mohit_2",
    });
  });

  it.each([
    ["nothing", undefined],
    ["a string", "acme/mohit/ram-test"],
    ["an array", [ref]],
    ["a missing slug", { workspaceSlug: "acme", hostSlug: "mohit" }],
    ["an empty slug", { ...ref, hostSlug: "  " }],
    ["a path traversal", { ...ref, eventTypeSlug: "../admin" }],
    ["a slash", { ...ref, workspaceSlug: "a/b" }],
    ["a query", { ...ref, eventTypeSlug: "x?y=1" }],
    ["a non-string", { ...ref, hostSlug: 42 }],
    ["an over-long slug", { ...ref, hostSlug: "a".repeat(121) }],
  ])("rejects %s", (_label, value) => {
    expect(parseCrmPublicRef(value)).toBeNull();
  });
});

describe("paths", () => {
  it("addresses the event type by its three slugs", () => {
    expect(publicBookingPath(ref)).toBe("/v1/public/booking/acme/mohit/ram-test");
    expect(publicBookingPath(ref, "/slots")).toBe("/v1/public/booking/acme/mohit/ram-test/slots");
    expect(publicBookingPath(ref, "/book")).toBe("/v1/public/booking/acme/mohit/ram-test/book");
  });

  it("addresses a booking by the guest's own token", () => {
    expect(publicManagePath("abcDEF123456", "cancel")).toBe(
      "/v1/public/booking/manage/abcDEF123456/cancel",
    );
    expect(publicManagePath("abcDEF123456", "reschedule")).toBe(
      "/v1/public/booking/manage/abcDEF123456/reschedule",
    );
  });

  it.each(["", "short", "has/slash12345", "../../etc/passwd", "a b c d e f g h", "x".repeat(201)])(
    "refuses the token %j",
    (token) => {
      expect(publicManagePath(token, "cancel")).toBeNull();
    },
  );
});

describe("parsePublicSlotDays", () => {
  it("groups slots by day and keeps the host", () => {
    const days = parsePublicSlotDays({
      eventTypeId: "e",
      days: [
        {
          date: "2026-10-05",
          slots: [
            { startAt: "2026-10-05T04:30:00.000Z", hostId: "h1" },
            { startAt: "2026-10-05T06:00:00.000Z" },
          ],
        },
        { date: "2026-10-06", slots: [{ start_at: "2026-10-06T04:30:00.000Z", host_id: "h2" }] },
      ],
    });
    expect([...days.keys()]).toEqual(["2026-10-05", "2026-10-06"]);
    expect(days.get("2026-10-05")).toEqual([
      { startAt: "2026-10-05T04:30:00.000Z", hostId: "h1" },
      { startAt: "2026-10-05T06:00:00.000Z" },
    ]);
    expect(days.get("2026-10-06")).toEqual([
      { startAt: "2026-10-06T04:30:00.000Z", hostId: "h2" },
    ]);
  });

  it("drops days without usable slots and malformed rows", () => {
    const days = parsePublicSlotDays({
      days: [
        { date: "2026-10-05", slots: [] },
        { date: "not-a-date", slots: [{ startAt: "2026-10-05T04:30:00.000Z" }] },
        { date: "2026-10-07", slots: [{ startAt: "garbage" }, null, { nope: 1 }] },
        { date: "2026-10-08", slots: "x" },
        "junk",
      ],
    });
    expect(days.size).toBe(0);
  });

  it.each([null, undefined, "x", 3, [], {}, { days: "x" }])("tolerates %j", (value) => {
    expect(parsePublicSlotDays(value).size).toBe(0);
  });
});

describe("timeInZone", () => {
  it("shows the wall clock of the guest's timezone", () => {
    const iso = "2026-10-05T04:30:00.000Z";
    expect(timeInZone(iso, "Asia/Kathmandu")).toBe("10:15");
    expect(timeInZone(iso, "UTC")).toBe("04:30");
    expect(timeInZone(iso, "America/New_York")).toBe("00:30");
    expect(timeInZone(iso, "Australia/Sydney")).toBe("15:30");
  });

  it("never shows 24:00 at midnight", () => {
    expect(timeInZone("2026-10-05T00:00:00.000Z", "UTC")).toBe("00:00");
  });

  it("returns an empty string for a bad instant", () => {
    expect(timeInZone("garbage", "UTC")).toBe("");
  });
});

describe("isIsoDate", () => {
  it("accepts only YYYY-MM-DD", () => {
    expect(isIsoDate("2026-10-05")).toBe(true);
    for (const bad of ["2026-10-5", "2026/10/05", "2026-10-05T00:00", "", null, 20261005]) {
      expect(isIsoDate(bad)).toBe(false);
    }
  });
});

function stubFetch(status: number, body: unknown, raw = false) {
  const fn = vi.fn(async () =>
    new Response(raw ? (body as string) : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("callPublicCrm", () => {
  it("unwraps the backend's { statusCode, data } envelope", async () => {
    const fetchMock = stubFetch(200, { statusCode: 200, data: { id: "b1" } });
    const res = await callPublicCrm("https://crm.test/", "/v1/public/booking/a/b/c/book", {
      method: "POST",
      body: { name: "Sita" },
    });
    expect(res).toEqual({ ok: true, status: 200, data: { id: "b1" } });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://crm.test/v1/public/booking/a/b/c/book");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Sita" }));
    expect(init.cache).toBe("no-store");
  });

  it("does not forward the visitor's address, which could be spoofed past the throttle", async () => {
    const fetchMock = stubFetch(200, { data: {} });
    await callPublicCrm("https://crm.test", "/v1/x");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const names = Object.keys(init.headers as Record<string, string>).map((h) => h.toLowerCase());
    expect(names).not.toContain("x-forwarded-for");
    expect(names).not.toContain("x-real-ip");
    // A GET carries no body or content type.
    expect(init.body).toBeUndefined();
    expect(names).not.toContain("content-type");
  });

  it("passes through a reply that has no envelope", async () => {
    stubFetch(200, { id: "b1" });
    expect(await callPublicCrm("https://crm.test", "/v1/x")).toMatchObject({
      ok: true,
      data: { id: "b1" },
    });
  });

  it.each([
    [409, { message: "booking.error.slotUnavailable" }, "slot_unavailable"],
    [400, { message: "That time is no longer available" }, "slot_unavailable"],
    [404, { message: "Not found" }, "not_found"],
    [429, { message: "ThrottlerException: Too Many Requests" }, "rate_limited"],
    [400, { message: ["email must be an email"] }, "invalid"],
    [422, { message: "bad" }, "invalid"],
    [500, { message: "boom" }, "unavailable"],
    [503, {}, "unavailable"],
  ])("maps HTTP %i %j to %s", async (status, body, code) => {
    stubFetch(status, body);
    const res = await callPublicCrm("https://crm.test", "/v1/x");
    expect(res).toMatchObject({ ok: false, status, code });
  });

  it("keeps working when an error body is not JSON", async () => {
    stubFetch(502, "<html>Bad gateway</html>", true);
    expect(await callPublicCrm("https://crm.test", "/v1/x")).toMatchObject({
      ok: false,
      code: "unavailable",
    });
  });

  it("reports an unreachable backend instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    expect(await callPublicCrm("https://crm.test", "/v1/x")).toEqual({
      ok: false,
      status: 502,
      code: "unavailable",
      message: "ECONNREFUSED",
    });
  });
});
