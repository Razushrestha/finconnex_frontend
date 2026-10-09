import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bindCrmSession } from "@/lib/activity-timeline";
import {
  addCrmScheduleOverride,
  BookingSlotUnavailableError,
  createCrmBooking,
  crmBookingFromResponse,
  dropBookingMeetings,
  normalizeCrmBooking,
  saveCrmHostSchedule,
  toCrmIsoDate,
} from "@/lib/booking/api";

const SESSION = {
  baseUrl: "https://crm.booking.test",
  accessToken: "test-access",
  workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const EVENT_TYPE = "11111111-1111-4111-8111-111111111111";
const HOST = "22222222-2222-4222-8222-222222222222";
const BOOKING = "33333333-3333-4333-8333-333333333333";
const WANTED = "2026-09-18T01:00:00.000Z";

type Post = { path: string; body: Record<string, unknown> };

/** Fakes the Nest booking routes `createCrmBooking` talks to. */
function installBackend(slotStarts: string[]) {
  const posts: Post[] = [];
  const original = globalThis.fetch;
  const reply = (data: unknown) =>
    new Response(JSON.stringify({ statusCode: 200, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), SESSION.baseUrl);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.pathname.endsWith(`/event-types/${EVENT_TYPE}/hosts`)) {
      return reply({ items: [{ id: HOST, name: "Ada" }] });
    }
    if (url.pathname.endsWith(`/event-types/${EVENT_TYPE}/available-slots`)) {
      return reply({
        days: [
          {
            date: "2026-09-18",
            slots: slotStarts.map((startAt) => ({ startAt, hostId: HOST })),
          },
        ],
      });
    }
    if (method === "POST" && url.pathname.endsWith("/bookings")) {
      posts.push({
        path: url.pathname,
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
      });
      return reply({ id: BOOKING, status: "CONFIRMED", meetingId: "m-1" });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return {
    posts,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

describe("createCrmBooking for a guest who picked an exact time", () => {
  let backend: ReturnType<typeof installBackend> | undefined;

  beforeEach(() => bindCrmSession(SESSION));
  afterEach(() => {
    backend?.restore();
    backend = undefined;
    bindCrmSession(null);
  });

  const guest = {
    eventTypeId: EVENT_TYPE,
    startTime: WANTED,
    name: "Grace Hopper",
    email: "grace@example.com",
  };

  it("books that exact slot and asks the backend not to email the guest", async () => {
    backend = installBackend([WANTED, "2026-09-18T01:30:00.000Z"]);
    const booked = await createCrmBooking({
      ...guest,
      notifyInvitee: false,
      snapToleranceMs: 60_000,
    });

    expect(backend.posts).toHaveLength(1);
    expect(backend.posts[0]!.body.startAt).toBe(WANTED);
    expect(backend.posts[0]!.body.notifyInvitee).toBe(false);
    expect(booked.id).toBe(BOOKING);
    expect(booked.meetingId).toBe("m-1");
  });

  it("refuses to move the guest to a different time instead of silently shifting it", async () => {
    // Nearest generated slot is 90 minutes away.
    backend = installBackend(["2026-09-18T02:30:00.000Z"]);
    await expect(
      createCrmBooking({ ...guest, snapToleranceMs: 60_000 }),
    ).rejects.toBeInstanceOf(BookingSlotUnavailableError);
    expect(backend.posts).toHaveLength(0);
  });

  it("sends staff-only notes as internalNotes, never as the guest-visible notes", async () => {
    backend = installBackend([WANTED]);
    await createCrmBooking({
      ...guest,
      snapToleranceMs: 60_000,
      internalNotes: "  Payment: Paid - Rs1000 of Rs1000 received  ",
    });

    const body = backend.posts[0]!.body;
    expect(body.internalNotes).toBe("Payment: Paid - Rs1000 of Rs1000 received");
    expect("notes" in body).toBe(false);
  });

  it("leaves internalNotes out when there are none", async () => {
    backend = installBackend([WANTED]);
    await createCrmBooking({ ...guest, snapToleranceMs: 60_000, internalNotes: "   " });
    expect("internalNotes" in backend.posts[0]!.body).toBe(false);
  });

  it("keeps the internal form's ±2h snapping by default", async () => {
    backend = installBackend(["2026-09-18T02:30:00.000Z"]);
    await createCrmBooking(guest);

    expect(backend.posts).toHaveLength(1);
    expect(backend.posts[0]!.body.startAt).toBe("2026-09-18T02:30:00.000Z");
    // Without the flag the backend keeps its default of emailing the invitee.
    expect("notifyInvitee" in backend.posts[0]!.body).toBe(false);
  });
});

describe("booking and meeting rows", () => {
  it("reads the meeting a booking was materialised into", () => {
    expect(normalizeCrmBooking({ id: "b", meetingId: "m" }).meetingId).toBe("m");
    expect(normalizeCrmBooking({ id: "b", meeting_id: "m2" }).meetingId).toBe("m2");
    expect(normalizeCrmBooking({ id: "b", meeting: { id: "m3" } }).meetingId).toBe("m3");
    expect(normalizeCrmBooking({ id: "b" }).meetingId).toBeUndefined();
  });

  it("drops the meeting twin of a booking so the appointment lists once", () => {
    const meetings = [{ id: "m-1" }, { id: "m-2" }, { id: "m-3" }];
    const bookings = [{ meetingId: "m-1" }, { meetingId: undefined }, { meetingId: "m-3" }];
    expect(dropBookingMeetings(meetings, bookings).map((row) => row.id)).toEqual(["m-2"]);
  });

  it("keeps every meeting when no booking owns one", () => {
    const meetings = [{ id: "m-1" }, { id: "m-2" }];
    expect(dropBookingMeetings(meetings, [{}, {}])).toEqual(meetings);
    expect(dropBookingMeetings(meetings, [])).toEqual(meetings);
  });

  it("sends a full ISO date when the CRM rejects a schedule that has none", async () => {
    bindCrmSession(SESSION);
    const bodies: Array<Record<string, unknown>> = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      if (bodies.length === 1) {
        return new Response(
          JSON.stringify({
            statusCode: 400,
            message: [
              "date must be a valid ISO-8601 value",
              "date must be a string",
            ],
            error: "Bad Request",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          data: {
            id: "44444444-4444-4444-8444-444444444444",
            rules: [],
            overrides: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    try {
      const saved = await saveCrmHostSchedule(HOST, {
        name: "Working hours",
        timezone: "Asia/Kathmandu",
        rules: [{ dayOfWeek: 1, startMinute: 540, endMinute: 1020 }],
      });
      expect(saved.id).toBe("44444444-4444-4444-8444-444444444444");
      expect(bodies[0]).not.toHaveProperty("date");
      expect(bodies[1]?.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    } finally {
      globalThis.fetch = original;
      bindCrmSession(null);
    }
  });

  it("posts a date-only override as an ISO-8601 timestamp", async () => {
    bindCrmSession(SESSION);
    let body: Record<string, unknown> = {};
    const original = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({ data: { id: "ov-1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      await addCrmScheduleOverride("55555555-5555-4555-8555-555555555555", {
        date: "2026-10-09",
        isUnavailable: false,
        startMinute: 540,
        endMinute: 1020,
      });
      expect(body.date).toBe("2026-10-09T00:00:00.000Z");
      expect(toCrmIsoDate("2026-10-09T05:45:00+05:45")).toBe(
        "2026-10-09T05:45:00+05:45",
      );
    } finally {
      globalThis.fetch = original;
      bindCrmSession(null);
    }
  });

  it("only trusts a create/reschedule response that carries an id", () => {
    expect(crmBookingFromResponse({ id: BOOKING, status: "CONFIRMED" })?.id).toBe(BOOKING);
    expect(crmBookingFromResponse({ items: [{ id: BOOKING }] })?.id).toBe(BOOKING);
    expect(crmBookingFromResponse({ status: "CONFIRMED" })).toBeNull();
    expect(crmBookingFromResponse(null)).toBeNull();
    expect(crmBookingFromResponse("nope")).toBeNull();
  });
});
