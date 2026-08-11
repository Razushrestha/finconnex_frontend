/** Booking confirm / cancel / notify orchestration (client demo store). */

import { createContact } from "@/lib/contacts/store";
import { createLead } from "@/lib/leads/store";
import { createMeeting, findMeetingById, listMeetings, saveMeetings } from "@/lib/meetings/store";
import type { MeetingType } from "@/lib/meetings/types";
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

export function confirmPublicBooking(input: {
  page: BookingPage;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  start: string;
  answers: Record<string, string>;
  /** Existing manage token when guest is rescheduling */
  rescheduleToken?: string;
}): { booking: Booking; manageToken: string } {
  const page = input.page;
  const end = slotEndIso(input.start, page.durationMinutes);
  const when = formatBookingWhen(input.start, end);
  const location = bookingLocationLabel(page);
  const { firstName, lastName } = splitName(input.guestName);

  const existing = input.rescheduleToken
    ? getBookingByToken(input.rescheduleToken)
    : undefined;

  const manageToken = existing?.manageToken ?? nextManageToken();
  const bookingId = existing?.id ?? nextBookingId();

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

    const contact = createContact({
      firstName,
      lastName,
      email: input.guestEmail,
      phone: input.guestPhone,
      company: input.answers.q1 || undefined,
      source: "Website",
      status: "Active",
      owner: page.owner,
    });
    contactId = contact.id;

    const meeting = createMeeting({
      title: `${page.title} — ${input.guestName}`,
      relatedTo: lead.name,
      type: meetingTypeForPage(page),
      startDateTime: input.start,
      endDateTime: end,
      status: "Scheduled",
      organizer: page.owner,
      location: page.location || page.meetingViaDetail,
      meetingLink: page.videoLink,
      agenda: `Booked via /book/${page.slug}`,
      notes: Object.entries(input.answers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
    });
    meetingId = meeting.id;

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

  // Guest-facing confirmation (inbox for owner + system trail)
  emitBookingNotification({
    type: "Meeting Reminder",
    title: existing ? "Booking rescheduled" : "Booking confirmation",
    message: confirmationMessage,
    recipient: page.owner,
    relatedTo: input.guestName,
    relatedHref: `/book/${page.slug}/manage/${manageToken}`,
  });
  emitBookingNotification({
    type: "Meeting Reminder",
    title: "Reminder queued",
    message: reminderMessage,
    recipient: page.owner,
    relatedTo: input.guestName,
    relatedHref: `/book/${page.slug}/manage/${manageToken}`,
  });

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
  };

  upsertBooking(booking);
  recomputePageStats(page.id);

  return { booking, manageToken };
}

export function cancelPublicBooking(token: string): Booking | null {
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
    emitBookingNotification({
      type: "System Alert",
      title: "Booking cancelled",
      message: `${booking.guestName} cancelled ${page.title} (${formatBookingWhen(booking.start, booking.end)})`,
      recipient: page.owner,
      relatedTo: booking.guestName,
      relatedHref: "/booking",
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
