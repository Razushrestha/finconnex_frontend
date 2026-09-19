/** Booking confirm / cancel / notify orchestration (client demo store). */

import { createLead } from "@/lib/leads/store";
import { createCalendarItem } from "@/lib/calendar/store";
import { createMeeting, findMeetingById, listMeetings, saveMeetings } from "@/lib/meetings/store";
import { createCrmMeeting, persistRemoteMeeting, tryCrmMeeting } from "@/lib/meetings/api";
import type { MeetingType } from "@/lib/meetings/types";
import {
  createCrmBooking,
  crmEventTypeIdOf,
  rescheduleCrmBooking,
  tryCrmBooking,
} from "@/lib/booking/api";
import {
  cancelQueuedBookingNotifies,
  dispatchBookingNotifications,
  queueBookingLifecycleNotifies,
} from "@/lib/booking/notify";
import { allocateConferencingLink, conferencingKind } from "@/lib/booking/meeting-link";
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
}): Promise<{ booking: Booking; manageToken: string }> {
  const page = input.page;
  const timezone = input.timezone?.trim() || page.timezone;
  const end = slotEndIso(input.start, page.durationMinutes);
  const when = formatBookingWhen(input.start, end);
  const location = bookingLocationLabel(page);
  const { firstName, lastName } = splitName(input.guestName);

  const existing = input.rescheduleToken
    ? getBookingByToken(input.rescheduleToken)
    : undefined;

  const onPublicBook =
    typeof window !== "undefined" &&
    /^\/book(\/|$)/i.test(window.location.pathname);

  const eventTypeId = crmEventTypeIdOf(page);
  if (eventTypeId && !onPublicBook) {
    const crmStart = new Date(input.start);
    const startIso = Number.isNaN(crmStart.getTime())
      ? input.start
      : crmStart.toISOString();
    if (existing?.id && input.rescheduleToken) {
      await tryCrmBooking(() => rescheduleCrmBooking(existing.id, startIso));
    } else {
      const booked = await tryCrmBooking(() =>
        createCrmBooking({
          eventTypeId,
          startTime: startIso,
          name: input.guestName.trim(),
          email: input.guestEmail.trim(),
          timezone,
          phone: input.guestPhone,
        }),
      );
      if (booked?.id && !existing) {
        /* local copy below keeps manage-token UX even when CRM accepted */
      }
    }
  }

  const manageToken = existing?.manageToken ?? nextManageToken();
  const bookingId = existing?.id ?? nextBookingId();
  const reference = existing?.reference ?? nextBookingRef();

  const crmMeeting =
    onPublicBook || existing?.joinUrl || conferencingKind(page) === "none"
      ? null
      : await tryCrmMeeting(() =>
          createCrmMeeting({
            title: `${page.title} — ${input.guestName}`,
            type: meetingTypeForPage(page),
            startDateTime: input.start,
            endDateTime: end,
            status: "Scheduled",
            organizer: page.owner,
            location: page.location || page.meetingViaDetail,
            agenda: `Booked via /book/${page.slug}`,
            timezone,
            externalAttendees: [{ email: input.guestEmail.trim(), name: input.guestName.trim() }],
          }),
        );
  if (crmMeeting) persistRemoteMeeting(crmMeeting);

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

    const meeting = createMeeting({
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
    });
    meetingId = meeting.id;

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
  } else if (meetingId) {
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

  void dispatchBookingNotifications({
    event: existing ? "reschedule" : "confirmed",
    page: { ...page, timezone, videoLink: joinUrl || page.videoLink },
    booking,
  }).then(() => {
    if (!existing) queueBookingLifecycleNotifies(page, booking);
  });

  return { booking, manageToken };
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
