/** Booking confirm / cancel / notify orchestration (client demo store). */

import { createLead } from "@/lib/leads/store";
import { createCalendarItem } from "@/lib/calendar/store";
import { createMeeting, findMeetingById, listMeetings, saveMeetings } from "@/lib/meetings/store";
import {
  cancelCrmMeeting,
  createCrmMeeting,
  persistRemoteMeeting,
  tryCrmMeeting,
  updateCrmMeeting,
} from "@/lib/meetings/api";
import type { Meeting, MeetingType } from "@/lib/meetings/types";
import { ensureCrmSession } from "@/lib/activity-timeline/auth";
import {
  cancelCrmBooking,
  createCrmBooking,
  crmBookingFromResponse,
  crmEventTypeIdOf,
  rescheduleCrmBooking,
  tryCrmBooking,
} from "@/lib/booking/api";
import {
  cancelQueuedBookingNotifies,
  dispatchBookingNotifications,
  queueBookingLifecycleNotifies,
} from "@/lib/booking/notify";
import { allocateConferencingLink } from "@/lib/booking/meeting-link";
import { nextBookingRef } from "@/lib/booking/guest-confirm-email";
import {
  formatNotificationAt,
  listNotifications,
  upsertNotification,
} from "@/lib/notifications/types";
import {
  bookingLocationLabel,
  formatBookingWhen,
  getBookingByToken,
  getBookingPageById,
  nextBookingId,
  nextManageToken,
  parseLocalDateTime,
  recomputePageStats,
  renderBookingTemplate,
  upsertBooking,
  type Booking,
  type BookingPage,
} from "@/lib/booking/types";

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  const firstName = parts[0] || "Guest";
  const lastName = parts.slice(1).join(" ") || "Lead";
  return { firstName, lastName };
}

function meetingTypeForPage(page: BookingPage): MeetingType {
  if (page.eventType === "Call") return "Phone Call";
  if (page.eventType === "Site Visit") return "In-person";
  if (page.meetingVia === "phone") return "Phone Call";
  if (page.meetingVia === "in_person") return "In-person";
  if (page.videoLink || page.meetingVia === "video") return "Video Call";
  return "Video Call";
}

function emitBookingNotification(input: {
  type: "Meeting Reminder" | "System Alert" | "Lead Assigned";
  title: string;
  message: string;
  recipient: string;
  relatedTo: string;
  relatedHref: string;
}) {
  const list = listNotifications();
  const nums = list
    .map((n) => Number(n.notificationId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 6000) + 1;
  return upsertNotification({
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    notificationId: `NTF-${n}`,
    status: "Unread",
    sentAt: formatNotificationAt(),
    type: input.type,
    title: input.title,
    message: input.message,
    relatedTo: input.relatedTo,
    relatedHref: input.relatedHref,
    recipient: input.recipient,
  });
}

function slotEndIso(startIso: string, durationMinutes: number) {
  const start = parseLocalDateTime(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

/** The guest picked an exact time: only rounding noise may separate it from a CRM slot. */
const EXACT_SLOT_TOLERANCE_MS = 60 * 1000;
/** Longest the guest waits on the CRM before their confirmation is shown anyway. */
const CRM_SYNC_TIMEOUT_MS = 20_000;

type CrmSaved = { bookingId?: string; meeting?: Meeting };

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Anonymous guests have no CRM session, so there is nothing to save to. */
async function hasCrmSession(): Promise<boolean> {
  try {
    return !!(await ensureCrmSession());
  } catch {
    return false;
  }
}

/**
 * Saves a new appointment in the CRM so Bookings → Upcoming Appointments lists
 * it. A booking is preferred; when the CRM has no slot at exactly this time the
 * appointment is saved as a meeting instead (the same fallback the internal
 * "New booking" form uses). Never throws.
 */
async function saveNewAppointmentInCrm(args: {
  eventTypeId: string;
  startIso: string;
  start: string;
  end: string;
  title: string;
  page: BookingPage;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  timezone: string;
}): Promise<CrmSaved> {
  if (!(await hasCrmSession())) return {};

  if (args.eventTypeId) {
    const booked = await tryCrmBooking(() =>
      createCrmBooking({
        eventTypeId: args.eventTypeId,
        startTime: args.startIso,
        name: args.guestName,
        email: args.guestEmail,
        timezone: args.timezone,
        phone: args.guestPhone,
        // The app sends the confirmation from the host's template.
        notifyInvitee: false,
        snapToleranceMs: EXACT_SLOT_TOLERANCE_MS,
      }),
    );
    if (booked) {
      return { bookingId: crmBookingFromResponse(booked.raw)?.id };
    }
  }

  const meeting = await tryCrmMeeting(() =>
    createCrmMeeting({
      title: args.title,
      type: meetingTypeForPage(args.page),
      startDateTime: args.start,
      endDateTime: args.end,
      status: "Scheduled",
      organizer: args.page.owner,
      location: args.page.location || args.page.meetingViaDetail,
      agenda: `Booked via /book/${args.page.slug}`,
      timezone: args.timezone,
      externalAttendees: [{ email: args.guestEmail, name: args.guestName }],
    }),
  );
  return meeting ? { meeting } : {};
}

/** Moves the CRM record a guest's original booking created. Never throws. */
async function moveAppointmentInCrm(args: {
  crmBookingId?: string;
  crmMeetingId?: string;
  startIso: string;
  start: string;
  end: string;
}): Promise<CrmSaved> {
  if (!args.crmBookingId && !args.crmMeetingId) return {};
  if (!(await hasCrmSession())) return {};

  if (args.crmBookingId) {
    const bookingId = args.crmBookingId;
    const moved = await tryCrmBooking(() =>
      rescheduleCrmBooking(bookingId, args.startIso),
    );
    // A reschedule replaces the booking with a new one; follow the new id.
    return { bookingId: crmBookingFromResponse(moved)?.id ?? bookingId };
  }

  const meetingId = args.crmMeetingId!;
  const meeting = await tryCrmMeeting(() =>
    updateCrmMeeting(meetingId, {
      startDateTime: args.start,
      endDateTime: args.end,
    }),
  );
  return meeting ? { meeting } : {};
}

/** Cancels the CRM record behind a guest booking so it leaves the table. Never throws. */
async function cancelAppointmentInCrm(booking: Booking): Promise<void> {
  const { crmBookingId, crmMeetingId } = booking;
  if (!crmBookingId && !crmMeetingId) return;
  if (!(await hasCrmSession())) return;
  if (crmBookingId) {
    await tryCrmBooking(() => cancelCrmBooking(crmBookingId, "Cancelled by guest"));
    return;
  }
  await tryCrmMeeting(() => cancelCrmMeeting(crmMeetingId!));
}

export async function confirmPublicBooking(input: {
  page: BookingPage;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  start: string;
  answers: Record<string, string>;
  timezone?: string;
  /** Existing manage token when guest is rescheduling */
  rescheduleToken?: string;
}): Promise<{
  booking: Booking;
  manageToken: string;
  emailError?: string;
}> {
  const page = input.page;
  const timezone = input.timezone?.trim() || page.timezone;
  const end = slotEndIso(input.start, page.durationMinutes);
  const when = formatBookingWhen(input.start, end);
  const location = bookingLocationLabel(page);
  const { firstName, lastName } = splitName(input.guestName);

  const existing = input.rescheduleToken
    ? getBookingByToken(input.rescheduleToken)
    : undefined;

  const manageToken = existing?.manageToken ?? nextManageToken();
  const bookingId = existing?.id ?? nextBookingId();
  const reference = existing?.reference ?? nextBookingRef();

  // Save the appointment in the CRM first so it appears in Bookings → Upcoming
  // Appointments. Failing or timing out never blocks the guest's confirmation.
  const startMs = new Date(input.start).getTime();
  const startIso = Number.isNaN(startMs)
    ? input.start
    : new Date(startMs).toISOString();
  const crmSaved =
    (await withTimeout(
      existing
        ? moveAppointmentInCrm({
            crmBookingId: existing.crmBookingId,
            crmMeetingId: existing.crmMeetingId,
            startIso,
            start: input.start,
            end,
          })
        : saveNewAppointmentInCrm({
            eventTypeId: crmEventTypeIdOf(page),
            startIso,
            start: input.start,
            end,
            title: `${page.title} — ${input.guestName.trim()}`,
            page,
            guestName: input.guestName.trim(),
            guestEmail: input.guestEmail.trim(),
            guestPhone: input.guestPhone,
            timezone,
          }),
      CRM_SYNC_TIMEOUT_MS,
    )) ?? {};
  const crmMeeting = crmSaved.meeting ?? null;
  if (crmMeeting) persistRemoteMeeting(crmMeeting);
  const crmBookingId = crmSaved.bookingId ?? existing?.crmBookingId;
  const crmMeetingId = crmMeeting?.id ?? existing?.crmMeetingId;

  const joinUrl =
    existing?.joinUrl ||
    crmMeeting?.meetingLink ||
    allocateConferencingLink(page, `${page.slug}-${reference}`);

  let leadId = existing?.leadId;
  let contactId = existing?.contactId;
  let meetingId = existing?.meetingId;
  let createdLead = existing?.createdLead ?? false;

  if (!existing) {
    const lead = createLead({
      firstName,
      lastName,
      email: input.guestEmail,
      phone: input.guestPhone,
      company: input.answers.q1 || undefined,
      source: "Website",
      status: "New",
      pipelineStage: "Appointment Booked",
      owner: page.owner,
    });
    leadId = lead.id;
    createdLead = true;

    // A CRM meeting is already cached locally by persistRemoteMeeting; a second
    // local copy would list the same appointment twice.
    meetingId =
      crmMeeting?.id ??
      createMeeting({
        title: `${page.title} — ${input.guestName}`,
        relatedTo: lead.name,
        type: meetingTypeForPage(page),
        startDateTime: input.start,
        endDateTime: end,
        status: "Scheduled",
        organizer: page.owner,
        location: page.location || page.meetingViaDetail,
        meetingLink: joinUrl || page.videoLink,
        agenda: `Booked via /book/${page.slug}`,
        notes: Object.entries(input.answers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      }).id;

    if (page.calendarInvites !== false) {
      createCalendarItem({
        title: `${page.title} — ${input.guestName}`,
        type: "Meeting",
        start: input.start,
        end,
        owner: page.owner,
        relatedTo: input.guestName,
      });
    }

    emitBookingNotification({
      type: "Lead Assigned",
      title: "New booking lead",
      message: `${input.guestName} booked ${page.title} for ${when}`,
      recipient: page.owner,
      relatedTo: lead.name,
      relatedHref: "/booking",
    });
  } else if (meetingId && !crmMeetingId) {
    // CRM meetings were already moved above and cached by persistRemoteMeeting.
    const found = findMeetingById(meetingId);
    if (found) {
      const updated = listMeetings().map((m) =>
        m.id === meetingId
          ? {
              ...m,
              startDateTime: input.start,
              endDateTime: end,
              status: "Rescheduled" as const,
              title: `${page.title} — ${input.guestName}`,
            }
          : m,
      );
      saveMeetings(updated);
    }
  }

  const confirmationMessage = renderBookingTemplate(page.confirmationTemplate, {
    name: input.guestName,
    datetime: when,
    location,
  });
  const reminderMessage = renderBookingTemplate(page.reminderTemplate, {
    name: input.guestName,
    datetime: when,
    location,
  });
  const nowIso = new Date().toISOString();

  const booking: Booking = {
    id: bookingId,
    pageId: page.id,
    pageSlug: page.slug,
    eventType: page.eventType,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim(),
    guestPhone: input.guestPhone?.trim() || undefined,
    start: input.start,
    end,
    answers: input.answers,
    status: "Confirmed",
    manageToken,
    createdLead,
    meetingId,
    crmBookingId,
    crmMeetingId,
    leadId,
    contactId,
    confirmationMessage,
    reminderMessage,
    confirmationSentAt: nowIso,
    reminderQueuedAt: nowIso,
    createdAt: existing?.createdAt ?? nowIso,
    rescheduledFrom: existing ? existing.start : undefined,
    reference,
    joinUrl,
  };

  upsertBooking(booking);
  recomputePageStats(page.id);

  const notify = await dispatchBookingNotifications({
    event: existing ? "reschedule" : "confirmed",
    page: { ...page, timezone, videoLink: joinUrl || page.videoLink },
    booking,
  });
  if (!existing) queueBookingLifecycleNotifies(page, booking);

  return { booking, manageToken, emailError: notify.emailError };
}

export async function cancelPublicBooking(token: string): Promise<Booking | null> {
  const booking = getBookingByToken(token);
  if (!booking) return null;
  const cancelled: Booking = {
    ...booking,
    status: "Cancelled",
    cancelledAt: new Date().toISOString(),
  };
  upsertBooking(cancelled);

  if (booking.meetingId) {
    const updated = listMeetings().map((m) =>
      m.id === booking.meetingId ? { ...m, status: "Cancelled" as const } : m,
    );
    saveMeetings(updated);
  }

  // Take the appointment out of Bookings → Upcoming Appointments too.
  await withTimeout(cancelAppointmentInCrm(booking), CRM_SYNC_TIMEOUT_MS);

  const page = getBookingPageById(booking.pageId);
  if (page) {
    cancelQueuedBookingNotifies(booking.id);
    void dispatchBookingNotifications({
      event: "cancel",
      page,
      booking: cancelled,
    });
    recomputePageStats(page.id);
  }
  return cancelled;
}

export function markBookingRescheduleIntent(token: string): Booking | null {
  const booking = getBookingByToken(token);
  if (!booking) return null;
  const next: Booking = { ...booking, status: "Rescheduled" };
  upsertBooking(next);
  recomputePageStats(booking.pageId);
  return next;
}
