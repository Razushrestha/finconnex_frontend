import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureCrmSession: vi.fn(),
  createCrmBooking: vi.fn(),
  rescheduleCrmBooking: vi.fn(),
  cancelCrmBooking: vi.fn(),
  createCrmMeeting: vi.fn(),
  updateCrmMeeting: vi.fn(),
  cancelCrmMeeting: vi.fn(),
  dispatchBookingNotifications: vi.fn(),
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
  updateCrmMeeting: mocks.updateCrmMeeting,
  cancelCrmMeeting: mocks.cancelCrmMeeting,
}));
vi.mock("@/lib/booking/notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/notify")>()),
  dispatchBookingNotifications: mocks.dispatchBookingNotifications,
  queueBookingLifecycleNotifies: vi.fn(),
  cancelQueuedBookingNotifies: vi.fn(),
}));

import { cancelPublicBooking, confirmPublicBooking } from "@/lib/booking/actions";
import { normalizeCrmBooking } from "@/lib/booking/api";
import { WEEKDAYS, type BookingPage } from "@/lib/booking/types";
import { listMeetings } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";

const EVENT_TYPE = "11111111-1111-4111-8111-111111111111";
const BOOKING_ID = "33333333-3333-4333-8333-333333333333";
const MOVED_BOOKING_ID = "44444444-4444-4444-8444-444444444444";
const MEETING_ID = "55555555-5555-4555-8555-555555555555";
const START = "2026-09-18T10:00";

const page: BookingPage = {
  id: EVENT_TYPE,
  crmEventTypeId: EVENT_TYPE,
  title: "Intro call",
  slug: "intro-call",
  owner: "Ada Host",
  eventType: "Consultation",
  durationMinutes: 30,
  bufferMinutes: 0,
  timezone: "Australia/Sydney",
  description: "",
  availability: WEEKDAYS.map((day) => ({
    day,
    enabled: true,
    start: "09:00",
    end: "17:00",
  })),
  questions: [],
  confirmationTemplate: "Hi {{name}}, you are booked for {{datetime}}.",
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
    guestName: `Grace Hopper ${counter}`,
    guestEmail: `grace${counter}@example.com`,
    guestPhone: "+61 400 000 000",
  };
}

function crmBooking(id = BOOKING_ID) {
  return normalizeCrmBooking({ id, status: "CONFIRMED", meetingId: "backend-meeting" });
}

function crmMeeting(title: string): Meeting {
  return {
    id: MEETING_ID,
    title,
    type: "Video Call",
    startDateTime: START,
    endDateTime: "2026-09-18T10:30",
    attendees: [],
    organizer: "Ada Host",
    status: "Scheduled",
  };
}

const slotTaken = () => Promise.reject(new Error("That time is no longer available"));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureCrmSession.mockResolvedValue({
    baseUrl: "https://crm.booking.test",
    accessToken: "token",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  });
  mocks.dispatchBookingNotifications.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("public booking is saved to the CRM so Bookings lists it", () => {
  it("saves a booking at the exact time, without a duplicate backend email", async () => {
    mocks.createCrmBooking.mockResolvedValue(crmBooking());
    const who = guest();

    const { booking } = await confirmPublicBooking({
      page,
      ...who,
      start: START,
      answers: {},
      timezone: "Australia/Sydney",
    });

    expect(mocks.createCrmBooking).toHaveBeenCalledTimes(1);
    const sent = mocks.createCrmBooking.mock.calls[0]![0] as Record<string, unknown>;
    expect(sent).toMatchObject({
      eventTypeId: EVENT_TYPE,
      startTime: new Date(START).toISOString(),
      name: who.guestName,
      email: who.guestEmail,
      timezone: "Australia/Sydney",
      notifyInvitee: false,
    });
    // A guest's chosen time must never be silently moved by the ±2h snapping.
    expect(sent.snapToleranceMs).toBeLessThanOrEqual(60_000);

    expect(mocks.createCrmMeeting).not.toHaveBeenCalled();
    expect(booking.crmBookingId).toBe(BOOKING_ID);
    expect(booking.crmMeetingId).toBeUndefined();
    expect(booking.status).toBe("Confirmed");
  });

  it("still sends the guest's confirmation through the app's own mailer", async () => {
    mocks.createCrmBooking.mockResolvedValue(crmBooking());
    mocks.dispatchBookingNotifications.mockResolvedValue({
      emailError: "SendGrid API key was rejected.",
    });

    const result = await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      answers: {},
    });

    expect(mocks.dispatchBookingNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ event: "confirmed" }),
    );
    // The email problem is surfaced, not hidden, and does not undo the save.
    expect(result.emailError).toBe("SendGrid API key was rejected.");
    expect(result.booking.crmBookingId).toBe(BOOKING_ID);
  });

  it("falls back to a CRM meeting when no slot exists at that time", async () => {
    mocks.createCrmBooking.mockImplementation(slotTaken);
    const who = guest();
    mocks.createCrmMeeting.mockResolvedValue(
      crmMeeting(`${page.title} — ${who.guestName}`),
    );

    const { booking } = await confirmPublicBooking({
      page,
      ...who,
      start: START,
      answers: {},
      timezone: "Australia/Sydney",
    });

    expect(mocks.createCrmMeeting).toHaveBeenCalledTimes(1);
    expect(mocks.createCrmMeeting.mock.calls[0]![0]).toMatchObject({
      title: `${page.title} — ${who.guestName}`,
      startDateTime: START,
      endDateTime: "2026-09-18T10:30",
      status: "Scheduled",
      organizer: "Ada Host",
      externalAttendees: [{ email: who.guestEmail, name: who.guestName }],
    });
    expect(booking.crmMeetingId).toBe(MEETING_ID);
    expect(booking.crmBookingId).toBeUndefined();
    expect(booking.meetingId).toBe(MEETING_ID);
    // One cached copy, not a CRM meeting plus a second local one.
    const copies = listMeetings().filter((m) => m.title.includes(who.guestName));
    expect(copies).toHaveLength(1);
    expect(copies[0]!.id).toBe(MEETING_ID);
  });

  it("saves meetings for pages that have no CRM event type", async () => {
    const localOnly: BookingPage = { ...page, id: "bp-local", crmEventTypeId: "" };
    const who = guest();
    mocks.createCrmMeeting.mockResolvedValue(
      crmMeeting(`${page.title} — ${who.guestName}`),
    );

    const { booking } = await confirmPublicBooking({
      page: localOnly,
      ...who,
      start: START,
      answers: {},
    });

    expect(mocks.createCrmBooking).not.toHaveBeenCalled();
    expect(mocks.createCrmMeeting).toHaveBeenCalledTimes(1);
    expect(booking.crmMeetingId).toBe(MEETING_ID);
  });

  it("still confirms the guest when nothing can be saved to the CRM", async () => {
    mocks.createCrmBooking.mockImplementation(slotTaken);
    mocks.createCrmMeeting.mockRejectedValue(new Error("backend down"));

    const { booking } = await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      answers: {},
    });

    expect(booking.status).toBe("Confirmed");
    expect(booking.crmBookingId).toBeUndefined();
    expect(booking.crmMeetingId).toBeUndefined();
    expect(mocks.dispatchBookingNotifications).toHaveBeenCalledTimes(1);
  });

  it("makes no CRM calls for anonymous guests but still confirms them", async () => {
    mocks.ensureCrmSession.mockResolvedValue(null);

    const { booking } = await confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      answers: {},
    });

    expect(mocks.createCrmBooking).not.toHaveBeenCalled();
    expect(mocks.createCrmMeeting).not.toHaveBeenCalled();
    expect(booking.status).toBe("Confirmed");
    expect(mocks.dispatchBookingNotifications).toHaveBeenCalledTimes(1);
  });

  it("does not leave the guest waiting forever on a hanging CRM", async () => {
    vi.useFakeTimers();
    mocks.createCrmBooking.mockReturnValue(new Promise(() => {}));

    const pending = confirmPublicBooking({
      page,
      ...guest(),
      start: START,
      answers: {},
    });
    await vi.advanceTimersByTimeAsync(20_000);
    const { booking } = await pending;

    expect(booking.status).toBe("Confirmed");
    expect(booking.crmBookingId).toBeUndefined();
    expect(mocks.dispatchBookingNotifications).toHaveBeenCalledTimes(1);
  });
});

describe("guest reschedule and cancel stay in step with the CRM", () => {
  it("reschedules the CRM booking and follows the replacement id", async () => {
    mocks.createCrmBooking.mockResolvedValue(crmBooking());
    const who = guest();
    const first = await confirmPublicBooking({ page, ...who, start: START, answers: {} });

    mocks.rescheduleCrmBooking.mockResolvedValue({
      id: MOVED_BOOKING_ID,
      status: "CONFIRMED",
    });
    const next = "2026-09-19T11:00";
    const second = await confirmPublicBooking({
      page,
      ...who,
      start: next,
      answers: {},
      rescheduleToken: first.manageToken,
    });

    expect(mocks.rescheduleCrmBooking).toHaveBeenCalledWith(
      BOOKING_ID,
      new Date(next).toISOString(),
    );
    // Rescheduling moves the booking; it must not create a second one.
    expect(mocks.createCrmBooking).toHaveBeenCalledTimes(1);
    expect(second.booking.crmBookingId).toBe(MOVED_BOOKING_ID);
    expect(second.booking.id).toBe(first.booking.id);
  });

  it("keeps the old CRM id when the reschedule is rejected", async () => {
    mocks.createCrmBooking.mockResolvedValue(crmBooking());
    const who = guest();
    const first = await confirmPublicBooking({ page, ...who, start: START, answers: {} });

    mocks.rescheduleCrmBooking.mockRejectedValue(new Error("409"));
    const second = await confirmPublicBooking({
      page,
      ...who,
      start: "2026-09-19T11:00",
      answers: {},
      rescheduleToken: first.manageToken,
    });

    expect(second.booking.crmBookingId).toBe(BOOKING_ID);
  });

  it("moves a CRM meeting when the appointment was saved as one", async () => {
    mocks.createCrmBooking.mockImplementation(slotTaken);
    const who = guest();
    mocks.createCrmMeeting.mockResolvedValue(
      crmMeeting(`${page.title} — ${who.guestName}`),
    );
    const first = await confirmPublicBooking({ page, ...who, start: START, answers: {} });

    const moved = {
      ...crmMeeting(`${page.title} — ${who.guestName}`),
      startDateTime: "2026-09-19T11:00",
      endDateTime: "2026-09-19T11:30",
    };
    mocks.updateCrmMeeting.mockResolvedValue(moved);
    const second = await confirmPublicBooking({
      page,
      ...who,
      start: "2026-09-19T11:00",
      answers: {},
      rescheduleToken: first.manageToken,
    });

    expect(mocks.updateCrmMeeting).toHaveBeenCalledWith(MEETING_ID, {
      startDateTime: "2026-09-19T11:00",
      endDateTime: "2026-09-19T11:30",
    });
    expect(mocks.rescheduleCrmBooking).not.toHaveBeenCalled();
    expect(second.booking.crmMeetingId).toBe(MEETING_ID);
    const cached = listMeetings().find((m) => m.id === MEETING_ID);
    expect(cached?.startDateTime).toBe("2026-09-19T11:00");
  });

  it("cancels the CRM booking when the guest cancels", async () => {
    mocks.createCrmBooking.mockResolvedValue(crmBooking());
    const first = await confirmPublicBooking({ page, ...guest(), start: START, answers: {} });
    mocks.cancelCrmBooking.mockResolvedValue({});

    const cancelled = await cancelPublicBooking(first.manageToken);

    expect(mocks.cancelCrmBooking).toHaveBeenCalledWith(BOOKING_ID, expect.any(String));
    expect(cancelled?.status).toBe("Cancelled");
  });

  it("cancels the CRM meeting when that is what was saved", async () => {
    mocks.createCrmBooking.mockImplementation(slotTaken);
    const who = guest();
    mocks.createCrmMeeting.mockResolvedValue(
      crmMeeting(`${page.title} — ${who.guestName}`),
    );
    const first = await confirmPublicBooking({ page, ...who, start: START, answers: {} });
    mocks.cancelCrmMeeting.mockResolvedValue(null);

    await cancelPublicBooking(first.manageToken);

    expect(mocks.cancelCrmMeeting).toHaveBeenCalledWith(MEETING_ID);
    expect(mocks.cancelCrmBooking).not.toHaveBeenCalled();
  });

  it("still cancels for the guest if the CRM cancel fails", async () => {
    mocks.createCrmBooking.mockResolvedValue(crmBooking());
    const first = await confirmPublicBooking({ page, ...guest(), start: START, answers: {} });
    mocks.cancelCrmBooking.mockRejectedValue(new Error("500"));

    const cancelled = await cancelPublicBooking(first.manageToken);

    expect(cancelled?.status).toBe("Cancelled");
  });

  it("skips the CRM for bookings that were never saved there", async () => {
    mocks.ensureCrmSession.mockResolvedValue(null);
    const first = await confirmPublicBooking({ page, ...guest(), start: START, answers: {} });
    mocks.ensureCrmSession.mockResolvedValue({ workspaceId: "w" });

    const cancelled = await cancelPublicBooking(first.manageToken);

    expect(cancelled?.status).toBe("Cancelled");
    expect(mocks.cancelCrmBooking).not.toHaveBeenCalled();
    expect(mocks.cancelCrmMeeting).not.toHaveBeenCalled();
  });
});
