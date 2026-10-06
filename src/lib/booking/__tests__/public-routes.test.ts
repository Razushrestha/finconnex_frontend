import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readPublicBookingPage: vi.fn(),
  writePublicBookingPage: vi.fn(),
  getSession: vi.fn(),
}));

// The real store is `server-only` and writes to the temp directory.
vi.mock("@/lib/booking/public-book-store", () => ({
  readPublicBookingPage: mocks.readPublicBookingPage,
  writePublicBookingPage: mocks.writePublicBookingPage,
}));
vi.mock("@/lib/auth/public-api", () => ({ crmAuthBaseUrl: () => "https://crm.test" }));
vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));

import { GET as getSlots } from "@/app/api/book/[slug]/slots/route";
import { POST as postBook } from "@/app/api/book/[slug]/book/route";
import { POST as postManage } from "@/app/api/book/[slug]/manage/route";
import { POST as postPublish } from "@/app/api/book/publish/route";

const REF = { workspaceSlug: "acme", hostSlug: "mohit", eventTypeSlug: "ram-test" };
const SAME_SITE = { "sec-fetch-site": "same-origin" };
const ctx = (slug = "ram-test") => ({ params: Promise.resolve({ slug }) });

function req(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  return new Request(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(init.headers ?? SAME_SITE) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

function backend(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function backendCall(fn: ReturnType<typeof backend>) {
  const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, body: init.body ? JSON.parse(init.body as string) : undefined };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readPublicBookingPage.mockResolvedValue({
    slug: "ram-test",
    title: "Ram test",
    crmPublic: REF,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("who may call the public booking routes", () => {
  const calls = {
    slots: () => getSlots(req("/api/book/ram-test/slots?from=2026-10-01&to=2026-10-31", { headers: {} }), ctx()),
    book: () =>
      postBook(req("/api/book/ram-test/book", { method: "POST", headers: {}, body: {} }), ctx()),
    manage: () =>
      postManage(req("/api/book/ram-test/manage", { method: "POST", headers: {}, body: {} }), ctx()),
  };

  it.each(Object.keys(calls) as (keyof typeof calls)[])(
    "%s refuses a request that did not come from this site",
    async (name) => {
      const fetchMock = backend(200, { data: {} });
      const res = await calls[name]();
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("refuses a cross-site request even with a matching-looking origin header", async () => {
    const fetchMock = backend(200, { data: {} });
    const res = await postBook(
      req("/api/book/ram-test/book", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site", origin: "http://localhost:3000" },
        body: {},
      }),
      ctx(),
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a same-origin Origin header from browsers that send no fetch metadata", async () => {
    backend(200, { data: { days: [] } });
    const res = await getSlots(
      req("/api/book/ram-test/slots?from=2026-10-01&to=2026-10-31", {
        headers: { origin: "http://localhost:3000" },
      }),
      ctx(),
    );
    expect(res.status).toBe(200);
  });

  it.each(["slots", "book", "manage"] as const)(
    "%s answers not_connected for a page the host never connected",
    async (name) => {
      const fetchMock = backend(200, { data: {} });
      mocks.readPublicBookingPage.mockResolvedValue({ slug: "ram-test", title: "Ram test" });
      const res =
        name === "slots"
          ? await getSlots(req("/api/book/ram-test/slots?from=2026-10-01&to=2026-10-02"), ctx())
          : name === "book"
            ? await postBook(req("/api/book/ram-test/book", { method: "POST", body: {} }), ctx())
            : await postManage(req("/api/book/ram-test/manage", { method: "POST", body: {} }), ctx());
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ code: "not_connected" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("answers not_connected for a page that does not exist", async () => {
    mocks.readPublicBookingPage.mockResolvedValue(null);
    const res = await getSlots(
      req("/api/book/nope/slots?from=2026-10-01&to=2026-10-02"),
      ctx("nope"),
    );
    expect(res.status).toBe(404);
  });

  it("ignores a hand-edited snapshot whose slugs are not plain slugs", async () => {
    const fetchMock = backend(200, { data: {} });
    mocks.readPublicBookingPage.mockResolvedValue({
      slug: "ram-test",
      crmPublic: { ...REF, workspaceSlug: "../../admin" },
    });
    const res = await getSlots(
      req("/api/book/ram-test/slots?from=2026-10-01&to=2026-10-02"),
      ctx(),
    );
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/book/[slug]/slots", () => {
  it("forwards to the published event type and returns the slots", async () => {
    const data = {
      eventTypeId: "e1",
      days: [{ date: "2026-10-05", slots: [{ startAt: "2026-10-05T04:30:00.000Z" }] }],
    };
    const fetchMock = backend(200, { statusCode: 200, data });

    const res = await getSlots(
      req(
        // The visitor cannot choose which workspace or event type is read.
        "/api/book/ram-test/slots?from=2026-10-01&to=2026-10-31&timezone=Asia%2FKathmandu&workspaceSlug=evil&token=abc",
      ),
      ctx(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
    const call = backendCall(fetchMock);
    expect(call.url).toBe(
      "https://crm.test/v1/public/booking/acme/mohit/ram-test/slots?from=2026-10-01&to=2026-10-31&timezone=Asia%2FKathmandu",
    );
    expect(call.init.method).toBe("GET");
  });

  it("defaults a missing end date to the start date and drops unknown timezones", async () => {
    const fetchMock = backend(200, { data: { days: [] } });
    await getSlots(req("/api/book/ram-test/slots?from=2026-10-05&timezone=Mars%2FOlympus"), ctx());
    expect(backendCall(fetchMock).url).toMatch(/\/slots\?from=2026-10-05&to=2026-10-05$/);
  });

  it.each([
    ["no dates", ""],
    ["a bad date", "?from=2026-13-45x&to=2026-10-31"],
    ["a non-ISO date", "?from=10/01/2026&to=10/31/2026"],
    ["an end before the start", "?from=2026-10-31&to=2026-10-01"],
    ["a window of years", "?from=2026-01-01&to=2028-01-01"],
  ])("rejects %s without calling the CRM", async (_label, query) => {
    const fetchMock = backend(200, { data: {} });
    const res = await getSlots(req(`/api/book/ram-test/slots${query}`), ctx());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives the guest a safe message, not the backend's, when the CRM is limited or down", async () => {
    backend(429, { message: "ThrottlerException: internal detail 10.0.0.7" });
    const limited = await getSlots(
      req("/api/book/ram-test/slots?from=2026-10-01&to=2026-10-31"),
      ctx(),
    );
    expect(limited.status).toBe(429);
    const body = await limited.json();
    expect(body.code).toBe("rate_limited");
    expect(JSON.stringify(body)).not.toContain("10.0.0.7");

    backend(500, { message: "stack trace at /srv/app.js" });
    const down = await getSlots(
      req("/api/book/ram-test/slots?from=2026-10-01&to=2026-10-31"),
      ctx(),
    );
    expect(down.status).toBe(502);
    expect(JSON.stringify(await down.json())).not.toContain("/srv/app.js");
  });
});

describe("POST /api/book/[slug]/book", () => {
  const valid = {
    startAt: "2026-10-05T10:15:00+05:45",
    name: "  Sita Rai ",
    email: " sita@example.com ",
    phone: "+977 9800000000",
    timezone: "Asia/Kathmandu",
    notes: "Company: Acme",
    hostId: "host-1",
  };
  const post = (body: unknown) =>
    postBook(req("/api/book/ram-test/book", { method: "POST", body }), ctx());

  it("books the exact slot and returns only what the page needs", async () => {
    const fetchMock = backend(201, {
      statusCode: 201,
      data: {
        id: "booking-1",
        status: "CONFIRMED",
        startAt: "2026-10-05T04:30:00.000Z",
        inviteeEmail: "sita@example.com",
        host: { id: "host-1", name: "Mohit Chapagain" },
        cancelToken: "cancel-token-123",
        rescheduleToken: "resched-token-123",
        internalNotes: "do not leak",
      },
    });

    const res = await post(valid);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      bookingId: "booking-1",
      startAt: "2026-10-05T04:30:00.000Z",
      hostName: "Mohit Chapagain",
      cancelToken: "cancel-token-123",
      rescheduleToken: "resched-token-123",
    });
    const call = backendCall(fetchMock);
    expect(call.url).toBe("https://crm.test/v1/public/booking/acme/mohit/ram-test/book");
    expect(call.init.method).toBe("POST");
    expect(call.body).toEqual({
      name: "Sita Rai",
      email: "sita@example.com",
      // Always UTC, whatever offset the browser sent.
      startAt: "2026-10-05T04:30:00.000Z",
      phone: "+977 9800000000",
      notes: "Company: Acme",
      timezone: "Asia/Kathmandu",
      hostId: "host-1",
    });
  });

  it("returns the Google Meet URL from the CRM booking and nothing else", async () => {
    backend(201, {
      data: {
        id: "booking-1",
        location: "Google Meet",
        meeting: { meetingLink: "https://meet.google.com/abc-defg-hij" },
        internalNotes: "do not leak",
      },
    });
    const res = await post(valid);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meetingLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(JSON.stringify(body)).not.toContain("do not leak");
  });

  it("forwards nothing the guest should not control", async () => {
    const fetchMock = backend(201, { data: { id: "b" } });
    await post({
      ...valid,
      token: "scheduling-link-token",
      answers: { q: 1 },
      workspaceId: "other",
      leadId: "someone-elses-lead",
      status: "CONFIRMED",
    });
    const sent = backendCall(fetchMock).body as Record<string, unknown>;
    for (const key of ["token", "answers", "workspaceId", "leadId", "status"]) {
      expect(sent).not.toHaveProperty(key);
    }
  });

  it("leaves out optional fields that are empty or invalid", async () => {
    const fetchMock = backend(201, { data: { id: "b" } });
    await post({
      startAt: valid.startAt,
      name: "Sita",
      email: "sita@example.com",
      phone: "  ",
      notes: "",
      timezone: "Not/AZone",
    });
    expect(backendCall(fetchMock).body).toEqual({
      name: "Sita",
      email: "sita@example.com",
      startAt: "2026-10-05T04:30:00.000Z",
    });
  });

  it("trims over-long text to the backend's limits", async () => {
    const fetchMock = backend(201, { data: { id: "b" } });
    await post({
      ...valid,
      name: "n".repeat(400),
      phone: "9".repeat(100),
      notes: "x".repeat(9000),
    });
    const sent = backendCall(fetchMock).body as Record<string, string>;
    expect(sent.name).toHaveLength(255);
    expect(sent.phone).toHaveLength(40);
    expect(sent.notes).toHaveLength(5000);
  });

  it.each([
    ["no body", undefined],
    ["a missing time", { ...valid, startAt: undefined }],
    ["a bad time", { ...valid, startAt: "tomorrow-ish" }],
    ["a missing name", { ...valid, name: "   " }],
    ["a missing email", { ...valid, email: undefined }],
    ["an invalid email", { ...valid, email: "not-an-email" }],
    ["two emails", { ...valid, email: "a@b.co, c@d.co" }],
    ["a bad host id", { ...valid, hostId: "../host" }],
    ["a non-object body", ["x"]],
  ])("rejects %s without calling the CRM", async (_label, body) => {
    const fetchMock = backend(201, { data: { id: "b" } });
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tells the page to pick another time when the slot was taken", async () => {
    backend(409, { message: "booking.error.slotUnavailable" });
    const res = await post(valid);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "That time was just booked. Please choose another time.",
      code: "slot_unavailable",
    });
  });

  it("does not report success when the CRM sends back no booking", async () => {
    backend(201, { data: {} });
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: "unavailable" });
  });
});

describe("POST /api/book/[slug]/manage", () => {
  const post = (body: unknown) =>
    postManage(req("/api/book/ram-test/manage", { method: "POST", body }), ctx());

  it("reschedules with the guest's token and returns the replacement booking", async () => {
    const fetchMock = backend(201, {
      data: {
        id: "booking-2",
        status: "CONFIRMED",
        startAt: "2026-10-06T05:00:00.000Z",
        cancelToken: "cancel-token-b",
        rescheduleToken: "resched-token-b",
        inviteeEmail: "sita@example.com",
      },
    });

    const res = await post({
      action: "reschedule",
      token: "resched-token-a",
      startAt: "2026-10-06T10:45:00+05:45",
      timezone: "Asia/Kathmandu",
    });

    expect(await res.json()).toEqual({
      bookingId: "booking-2",
      status: "CONFIRMED",
      startAt: "2026-10-06T05:00:00.000Z",
      cancelToken: "cancel-token-b",
      rescheduleToken: "resched-token-b",
    });
    const call = backendCall(fetchMock);
    expect(call.url).toBe("https://crm.test/v1/public/booking/manage/resched-token-a/reschedule");
    expect(call.body).toEqual({ startAt: "2026-10-06T05:00:00.000Z", timezone: "Asia/Kathmandu" });
  });

  it("cancels with the guest's token and a trimmed reason", async () => {
    const fetchMock = backend(201, { data: { id: "booking-1", status: "CANCELLED" } });
    const res = await post({
      action: "cancel",
      token: "cancel-token-a",
      reason: `  ${"r".repeat(2000)}`,
    });
    expect(await res.json()).toMatchObject({ bookingId: "booking-1", status: "CANCELLED" });
    const call = backendCall(fetchMock);
    expect(call.url).toBe("https://crm.test/v1/public/booking/manage/cancel-token-a/cancel");
    expect((call.body as { reason: string }).reason).toHaveLength(1000);
  });

  it("sends an empty body when there is no reason", async () => {
    const fetchMock = backend(201, { data: { id: "b" } });
    await post({ action: "cancel", token: "cancel-token-a" });
    expect(backendCall(fetchMock).body).toEqual({});
  });

  it.each([
    ["no body", undefined],
    ["an unknown action", { action: "delete", token: "cancel-token-a" }],
    ["no token", { action: "cancel" }],
    ["a token that is not a token", { action: "cancel", token: "../../admin/users" }],
    ["a short token", { action: "cancel", token: "abc" }],
    ["a reschedule with no time", { action: "reschedule", token: "resched-token-a" }],
    ["a reschedule with a bad time", { action: "reschedule", token: "resched-token-a", startAt: "x" }],
  ])("rejects %s without calling the CRM", async (_label, body) => {
    const fetchMock = backend(201, { data: {} });
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a taken slot and an unknown booking distinctly", async () => {
    backend(409, { message: "booking.error.slotUnavailable" });
    const taken = await post({
      action: "reschedule",
      token: "resched-token-a",
      startAt: "2026-10-06T05:00:00.000Z",
    });
    expect(taken.status).toBe(409);
    expect(await taken.json()).toMatchObject({ code: "slot_unavailable" });

    backend(404, { message: "booking.error.notFound" });
    const unknown = await post({ action: "cancel", token: "cancel-token-zzz" });
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ code: "not_found" });
  });
});

describe("POST /api/book/publish keeps the CRM address", () => {
  const page = (extra: Record<string, unknown> = {}) => ({
    id: "et-1",
    crmEventTypeId: "et-1",
    slug: "ram-test",
    title: "Ram test",
    ...extra,
  });
  const publish = (body: unknown) =>
    postPublish(req("/api/book/publish", { method: "POST", body }));
  const written = () => mocks.writePublicBookingPage.mock.calls[0]![0] as Record<string, unknown>;

  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ user: "host" });
    mocks.readPublicBookingPage.mockResolvedValue(null);
  });

  it("requires a signed-in host", async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await publish(page({ crmPublic: REF }));
    expect(res.status).toBe(401);
    expect(mocks.writePublicBookingPage).not.toHaveBeenCalled();
  });

  it("publishes the address the host's browser worked out", async () => {
    await publish(page({ crmPublic: { ...REF, workspaceSlug: " acme " } }));
    expect(written().crmPublic).toEqual(REF);
  });

  it("drops an address that is not made of plain slugs", async () => {
    await publish(page({ crmPublic: { ...REF, hostSlug: "a/b" } }));
    expect(written().crmPublic).toBeUndefined();
  });

  it("keeps the published address when a later save could not work it out", async () => {
    mocks.readPublicBookingPage.mockResolvedValue(page({ crmPublic: REF }));
    await publish(page({ title: "Ram test (edited)" }));
    expect(written().crmPublic).toEqual(REF);
    expect(written().title).toBe("Ram test (edited)");
  });

  it("does not carry the address over to a different event type", async () => {
    mocks.readPublicBookingPage.mockResolvedValue(page({ crmPublic: REF }));
    await publish(page({ id: "et-2", crmEventTypeId: "et-2" }));
    expect(written().crmPublic).toBeUndefined();
  });

  it("prefers the freshly worked out address over the old one", async () => {
    mocks.readPublicBookingPage.mockResolvedValue(page({ crmPublic: REF }));
    const renamed = { ...REF, eventTypeSlug: "ram-test-2" };
    await publish(page({ crmPublic: renamed }));
    expect(written().crmPublic).toEqual(renamed);
  });
});
