import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureCrmSession: vi.fn(),
  createCrmBooking: vi.fn(),
  rescheduleCrmBooking: vi.fn(),
  cancelCrmBooking: vi.fn(),
  createCrmMeeting: vi.fn(),
  dispatchBookingNotifications: vi.fn(),
  bookPublicSlot: vi.fn(),
  managePublicBooking: vi.fn(),
}));

vi.mock("@/lib/activity-timeline/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/activity-timeline/auth")>()),
  ensureCrmSession: mocks.ensureCrmSession,
}));
vi.mock("@/lib/booking/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/api")>()),
  createCrmBooking: mocks.createCrmBooking,
  rescheduleCrmBooking: mocks.rescheduleCrmBooking,
  cancelCrmBooking: mocks.cancelCrmBooking,
}));
vi.mock("@/lib/meetings/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/meetings/api")>()),
  createCrmMeeting: mocks.createCrmMeeting,
}));
vi.mock("@/lib/booking/notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/notify")>()),
  dispatchBookingNotifications: mocks.dispatchBookingNotifications,
  queueBookingLifecycleNotifies: vi.fn(),
  cancelQueuedBookingNotifies: vi.fn(),
}));
vi.mock("@/lib/booking/public-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/public-client")>()),
  bookPublicSlot: mocks.bookPublicSlot,
  managePublicBooking: mocks.managePublicBooking,
}));

import { cancelPublicBooking, confirmPublicBooking } from "@/lib/booking/actions";
import { normalizeCrmBooking } from "@/lib/booking/api";
import { PublicBookingError } from "@/lib/booking/public-client";
import { listBookings, WEEKDAYS, type BookingPage } from "@/lib/booking/types";

const EVENT_TYPE = "11111111-1111-4111-8111-111111111111";
const START = "2026-10-05T10:15";
const START_ISO = "2026-10-05T04:30:00.000Z";
const NEXT_ISO = "2026-10-06T05:00:00.000Z";

const page: BookingPage = {
  id: EVENT_TYPE,
  crmEventTypeId: EVENT_TYPE,
  crmPublic: { workspaceSlug: "acme", hostSlug: "mohit", eventTypeSlug: "ram-test" },
  title: "Ram test",
  slug: "ram-test",
  owner: "Mohit Chapagain",
  eventType: "Consultation",
  durationMinutes: 90,
  bufferMinutes: 0,
  timezone: "Asia/Katmandu",
  description: "",
  availability: WEEKDAYS.map((day) => ({ day, enabled: true, start: "09:00", end: "17:00" })),
  questions: [
    { id: "q1", label: "Company", required: false },
    { id: "q2", label: "Medical history", required: false, ephi: true },
    { id: "q3", label: "Anything else?", required: false },
  ],
  confirmationTemplate: "Hi {{name}}, booked for {{datetime}}.",
  reminderTemplate: "Reminder for {{datetime}}.",
  status: "Live",
  views: 0,
  bookingsCount: 0,
  cancelRate: 0,
  createdAt: "",
};

let counter = 0;
function guest() {
  counter += 1;
  return {
    guestName: `Sita Rai ${counter}`,
    guestEmail: `sita${counter}@example.com`,
    guestPhone: "+977 9800000000",
  };
}

const accepted = (id = "booking-1", suffix = "a") => ({
  ok: true as const,
  bookingId: id,
  cancelToken: `cancel-token-${suffix}`,
  rescheduleToken: `resched-token-${suffix}`,
});

beforeEach(() => {
  vi.clearAllMocks();
  // A signed-out guest: there is no CRM session to fall back on.
  mocks.ensureCrmSession.mockResolvedValue(null);
  mocks.dispatchBookingNotifications.mockResolvedValue({});
});

describe("a signed-out guest's booking reaches the CRM", () => {
  it("books through the public API without needing a CRM session", async () => {
    mocks.bookPublicSlot.mockResolvedValue(accepted());
    const who = guest();

    const { booking } = await confirmPublicBooking({
      page,
      ...who,
      start: START,
      startAtIso: START_ISO,
      hostId: "host-1",
      timezone: "Asia/Katmandu",
      answers: {},
    });

    expect(mocks.bookPublicSlot).toHaveBeenCalledTimes(1);
    const [slug, sent] = mocks.bookPublicSlot.mock.calls[0]!;
    expect(slug).toBe("ram-test");
    expect(sent).toMatchObject({
      startAt: START_ISO,
      name: who.guestName,
      email: who.guestEmail,
      phone: who.guestPhone,
      timezone: "Asia/Katmandu",
      hostId: "host-1",
    });
    // Saved exactly once: the session path must not add a second CRM record.
    expect(mocks.createCrmBooking).not.toHaveBeenCalled();
    expect(mocks.createCrmMeeting).not.toHaveBeenCalled();
    expect(mocks.ensureCrmSession).not.toHaveBeenCalled();

    expect(booking.crmBookingId).toBe("booking-1");
    expect(booking.crmCancelToken).toBe("cancel-token-a");
    expect(booking.crmRescheduleToken).toBe("resched-token-a");
    expect(booking.status).toBe("Confirmed");
    expect(mocks.dispatchBookingNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ event: "confirmed" }),
    );
  });

  it("tells the host the guest's answers, but never sensitive (ePHI) ones", async () => {
    mocks.bookPublicSlot.mockResolvedValue(accepted());

    await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      startAtIso: START_ISO,
      answers: { q1: "Acme Pty", q2: "diabetes", q3: "  ", unknown: "x" },
    });

    const sent = mocks.bookPublicSlot.mock.calls[0]![1] as { notes?: string };
    expect(sent.notes).toBe("Company: Acme Pty\nunknown: x");
    expect(sent.notes).not.toContain("diabetes");
  });

  it("leaves notes out when there is nothing to say", async () => {
    mocks.bookPublicSlot.mockResolvedValue(accepted());

    await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });

    const sent = mocks.bookPublicSlot.mock.calls[0]![1] as Record<string, unknown>;
    expect(sent.notes).toBeUndefined();
  });

  it("does not confirm, and records nothing, when the slot was just taken", async () => {
    mocks.bookPublicSlot.mockResolvedValue({
      ok: false,
      code: "slot_unavailable",
      message: "That time was just booked. Please choose another time.",
    });
    const before = listBookings().length;

    const attempt = confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });

    await expect(attempt).rejects.toMatchObject({
      name: "PublicBookingError",
      code: "slot_unavailable",
      message: "That time was just booked. Please choose another time.",
    });
    expect(await attempt.catch((e) => e)).toBeInstanceOf(PublicBookingError);
    // No phantom local confirmation for an appointment the host will never see.
    expect(listBookings()).toHaveLength(before);
    expect(mocks.dispatchBookingNotifications).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "rate_limited", "not_found", "invalid"] as const)(
    "does not confirm when the CRM answers %s",
    async (code) => {
      mocks.bookPublicSlot.mockResolvedValue({ ok: false, code, message: "nope" });
      const before = listBookings().length;

      await expect(
        confirmPublicBooking({
          page,
          ...guest(),
          start: START,
          startAtIso: START_ISO,
          answers: {},
        }),
      ).rejects.toMatchObject({ code, message: "nope" });
      expect(listBookings()).toHaveLength(before);
      expect(mocks.dispatchBookingNotifications).not.toHaveBeenCalled();
    },
  );

  it("falls back to the session flow when the server says the page is not connected", async () => {
    mocks.bookPublicSlot.mockResolvedValue({
      ok: false,
      code: "not_connected",
      message: "not connected",
    });
    mocks.ensureCrmSession.mockResolvedValue({ workspaceId: "w" });
    mocks.createCrmBooking.mockResolvedValue(
      normalizeCrmBooking({ id: "session-booking", status: "CONFIRMED" }),
    );

    const { booking } = await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });

    expect(mocks.createCrmBooking).toHaveBeenCalledTimes(1);
    expect(booking.crmBookingId).toBe("session-booking");
    expect(booking.crmCancelToken).toBeUndefined();
  });

  it("does not use the public API without an exact slot or for unconnected pages", async () => {
    await confirmPublicBooking({ page, ...guest(), start: START, answers: {} });
    const { crmPublic: _unused, ...unconnected } = page;
    void _unused;
    await confirmPublicBooking({
      page: unconnected,
      ...guest(),
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });

    expect(mocks.bookPublicSlot).not.toHaveBeenCalled();
  });
});

describe("a signed-out guest's reschedule and cancel follow the CRM", () => {
  it("moves the CRM booking with the guest's own token and keeps the new tokens", async () => {
    mocks.bookPublicSlot.mockResolvedValue(accepted("booking-1", "a"));
    const who = guest();
    const first = await confirmPublicBooking({
      page,
      ...who,
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });

    mocks.managePublicBooking.mockResolvedValue({
      ok: true,
      bookingId: "booking-2",
      cancelToken: "cancel-token-b",
      rescheduleToken: "resched-token-b",
    });
    const second = await confirmPublicBooking({
      page,
      ...who,
      start: "2026-10-06T10:30",
      startAtIso: NEXT_ISO,
      timezone: "Asia/Katmandu",
      answers: {},
      rescheduleToken: first.manageToken,
    });

    expect(mocks.managePublicBooking).toHaveBeenCalledWith("ram-test", {
      action: "reschedule",
      token: "resched-token-a",
      startAt: NEXT_ISO,
      timezone: "Asia/Katmandu",
    });
    // Moved, not duplicated.
    expect(mocks.bookPublicSlot).toHaveBeenCalledTimes(1);
    expect(second.booking.id).toBe(first.booking.id);
    expect(second.booking.crmBookingId).toBe("booking-2");
    expect(second.booking.crmCancelToken).toBe("cancel-token-b");
    expect(second.booking.crmRescheduleToken).toBe("resched-token-b");
  });

  it("does not move the guest when the new time was just taken", async () => {
    mocks.bookPublicSlot.mockResolvedValue(accepted("booking-1", "a"));
    const who = guest();
    const first = await confirmPublicBooking({
      page,
      ...who,
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });

    mocks.managePublicBooking.mockResolvedValue({
      ok: false,
      code: "slot_unavailable",
      message: "taken",
    });
    await expect(
      confirmPublicBooking({
        page,
        ...who,
        start: "2026-10-06T10:30",
        startAtIso: NEXT_ISO,
        answers: {},
        rescheduleToken: first.manageToken,
      }),
    ).rejects.toMatchObject({ code: "slot_unavailable" });

    const stored = listBookings().find((b) => b.id === first.booking.id);
    expect(stored?.crmBookingId).toBe("booking-1");
    expect(stored?.crmRescheduleToken).toBe("resched-token-a");
  });

  it("creates the CRM booking when the guest reschedules one that never reached it", async () => {
    // Booked in the guest's browser before the page was connected to the CRM.
    const { crmPublic: _unused, ...legacyPage } = page;
    void _unused;
    const who = guest();
    const legacy = await confirmPublicBooking({
      page: legacyPage,
      ...who,
      start: START,
      answers: {},
    });
    expect(legacy.booking.crmBookingId).toBeUndefined();

    mocks.bookPublicSlot.mockResolvedValue(accepted("booking-9", "z"));
    const moved = await confirmPublicBooking({
      page,
      ...who,
      start: "2026-10-06T10:30",
      startAtIso: NEXT_ISO,
      answers: {},
      rescheduleToken: legacy.manageToken,
    });

    expect(mocks.managePublicBooking).not.toHaveBeenCalled();
    expect(mocks.bookPublicSlot).toHaveBeenCalledTimes(1);
    expect(moved.booking.id).toBe(legacy.booking.id);
    expect(moved.booking.crmBookingId).toBe("booking-9");
    expect(moved.booking.crmCancelToken).toBe("cancel-token-z");
  });

  it("cancels the CRM booking with the guest's token, not a CRM session", async () => {
    mocks.bookPublicSlot.mockResolvedValue(accepted());
    const first = await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });
    mocks.managePublicBooking.mockResolvedValue({ ok: true });

    const cancelled = await cancelPublicBooking(first.manageToken);

    expect(mocks.managePublicBooking).toHaveBeenCalledWith("ram-test", {
      action: "cancel",
      token: "cancel-token-a",
      reason: "Cancelled by guest",
    });
    expect(mocks.cancelCrmBooking).not.toHaveBeenCalled();
    expect(cancelled?.status).toBe("Cancelled");
  });

  it("still cancels for the guest when the CRM cannot be reached", async () => {
    mocks.bookPublicSlot.mockResolvedValue(accepted());
    const first = await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      startAtIso: START_ISO,
      answers: {},
    });
    mocks.managePublicBooking.mockResolvedValue({
      ok: false,
      code: "unavailable",
      message: "down",
    });

    const cancelled = await cancelPublicBooking(first.manageToken);

    expect(cancelled?.status).toBe("Cancelled");
  });
});
