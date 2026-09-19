/**
 * Consultation notification prefs → real Email / In-app / SMS / WhatsApp sends.
 */

import { sendEmailDemoLive, sendSmsDemoLive } from "@/lib/comms/send-gateway";
import {
  createCrmMessage,
  isCrmMessageId,
  persistRemoteMessage,
  sendCrmMessage,
} from "@/lib/messages/api";
import { createMessage } from "@/lib/messages/store";
import {
  formatNotificationAt,
  listNotifications,
  upsertNotification,
} from "@/lib/notifications/types";
import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import {
  formatBookingWhen,
  getBookingById,
  getBookingPageById,
  parseLocalDateTime,
  type Booking,
  type BookingPage,
} from "@/lib/booking/types";
import {
  bookingConfirmEmailHtml,
} from "@/lib/booking/guest-confirm-email";
import {
  enabledNotifyChannels,
  interpolateNotify,
  notificationRowFor,
  type BookingNotifyEvent,
  type NotificationRow,
  type NotifyChannel,
  type NotifyTokens,
} from "@/lib/booking/notify-prefs";

export {
  DEFAULT_NOTIFICATIONS,
  NOTIFY_CHANNELS,
  enabledNotifyChannels,
  interpolateNotify,
  mergeNotificationPrefs,
  notificationRowFor,
  type BookingNotifyEvent,
  type NotificationRow,
  type NotifyChannel,
  type NotifyTokens,
} from "@/lib/booking/notify-prefs";


function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikePhone(value: string) {
  return /\+?\d[\d\s()-]{6,}\d/.test(value.trim());
}

function pushInApp(input: {
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
  upsertNotification({
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

async function sendEmailSafe(email: string, subject: string, body: string) {
  if (!looksLikeEmail(email)) return;
  await sendEmailDemoLive({
    email,
    subject: subject.trim() || "Appointment update",
    body: body.trim() || subject,
  });
}

async function sendSmsSafe(phone: string, body: string) {
  if (!looksLikePhone(phone) || !body.trim()) return;
  await sendSmsDemoLive({ phone: phone.trim(), body: body.trim() });
}

async function sendWhatsAppSafe(phone: string, body: string, relatedTo: string) {
  const text = body.trim();
  if (!text) return;
  const to = looksLikePhone(phone) ? phone.trim() : "";
  try {
    if (to) {
      const created = persistRemoteMessage(
        await createCrmMessage({
          type: "External",
          subject: "WhatsApp",
          body: text,
          to,
          relatedTo,
          channel: "WHATSAPP",
          send: true,
        }),
      );
      if (created && isCrmMessageId(created.id)) {
        persistRemoteMessage(await sendCrmMessage(created.id));
        return;
      }
    }
  } catch {
    /* fall through to local trail */
  }
  createMessage({
    type: "External",
    subject: "WhatsApp",
    body: text,
    from: "FinConnex",
    to: to || relatedTo,
    relatedTo,
    status: "Sent",
    template: "WhatsApp",
  });
}

function tokensFor(page: BookingPage, booking: Booking): NotifyTokens {
  const when = formatBookingWhen(booking.start, booking.end);
  return {
    name: booking.guestName,
    firstName: firstNameOf(booking.guestName),
    email: booking.guestEmail,
    phone: booking.guestPhone ?? "",
    datetime: when,
    location:
      booking.joinUrl ||
      page.meetingViaDetail ||
      page.location ||
      page.videoLink ||
      "Meeting",
    title: page.title,
    timezone: page.timezone,
    owner: page.consultants?.[0] || page.owner,
    ownerEmail: looksLikeEmail(page.owner) ? page.owner : "",
    joinUrl: booking.joinUrl || page.videoLink,
    reference: booking.reference,
  };
}

function confirmEmailCopy(page: BookingPage, booking: Booking) {
  const start = parseLocalDateTime(booking.start);
  const dateLabel = `${start.getDate()} ${start.toLocaleDateString("en-US", {
    month: "short",
  })} ${start.getFullYear()}`;
  const timePart = booking.start.includes("T")
    ? booking.start.split("T")[1]!.slice(0, 5)
    : "09:00";
  const [hh, mm] = timePart.split(":");
  const hour = Number(hh);
  const minute = String(Number(mm) || 0).padStart(2, "0");
  const timeLabel = `${String(hour % 12 || 12).padStart(2, "0")}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
  const offset = (() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: page.timezone,
        timeZoneName: "longOffset",
      }).formatToParts(start);
      const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
      const n = raw.replace(/^GMT/i, "").trim();
      return n.startsWith("+") || n.startsWith("-") ? `GMT ${n}` : raw || "";
    } catch {
      return "";
    }
  })();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return bookingConfirmEmailHtml({
    guestName: booking.guestName,
    hostName: page.consultants?.[0] || page.owner || "Host",
    title: page.title,
    dateLabel,
    timeLabel,
    timezoneLabel: `${page.timezone}${offset ? ` ${offset}` : ""}`,
    reference: booking.reference || booking.id,
    joinUrl: booking.joinUrl || page.videoLink,
    slug: page.slug,
    manageToken: booking.manageToken,
    origin,
  });
}

export async function dispatchBookingNotifications(input: {
  event: BookingNotifyEvent;
  page: BookingPage;
  booking: Booking;
}): Promise<NotifyChannel[]> {
  const row = notificationRowFor(
    input.page.notifyPrefs as NotificationRow[] | undefined,
    input.event,
  );
  const channels = enabledNotifyChannels(row);
  if (channels.length === 0) return [];

  const tokens = tokensFor(input.page, input.booking);
  const subject = interpolateNotify(row.emailSubject, tokens);
  const emailBody = interpolateNotify(row.emailBody, tokens);
  const smsBody = interpolateNotify(row.smsBody, tokens);
  const href = `/book/${input.page.slug}/manage/${input.booking.manageToken}`;
  const contact = row.notifyContact !== false;
  const user = Boolean(row.notifyUser);

  const tasks: Array<Promise<unknown>> = [];

  if (channels.includes("Email")) {
    if (contact) {
      if (input.event === "confirmed") {
        const copy = confirmEmailCopy(input.page, input.booking);
        tasks.push(sendEmailSafe(tokens.email, copy.subject, copy.html));
      } else {
        tasks.push(sendEmailSafe(tokens.email, subject, emailBody));
      }
    }
    if (user && tokens.ownerEmail) {
      tasks.push(sendEmailSafe(tokens.ownerEmail, subject, emailBody));
    }
  }

  if (channels.includes("In-app")) {
    pushInApp({
      type: input.event === "cancel" ? "System Alert" : "Meeting Reminder",
      title: row.title,
      message: smsBody || emailBody,
      recipient: input.page.owner,
      relatedTo: input.booking.guestName,
      relatedHref: href,
    });
  }

  if (channels.includes("SMS")) {
    if (contact) tasks.push(sendSmsSafe(tokens.phone, smsBody));
    if (user && looksLikePhone(input.page.owner)) {
      tasks.push(sendSmsSafe(input.page.owner, smsBody));
    }
  }

  if (channels.includes("WhatsApp")) {
    if (contact) {
      tasks.push(sendWhatsAppSafe(tokens.phone, smsBody || emailBody, tokens.name));
    }
  }

  await Promise.allSettled(tasks);
  return channels;
}

type QueuedNotify = {
  id: string;
  event: "reminder" | "followup";
  bookingId: string;
  pageId: string;
  fireAt: string;
  sent?: boolean;
};

const QUEUE_KEY = "booking:notify-queue:v1";

function readQueue(): QueuedNotify[] {
  return readPersistedJson<QueuedNotify[]>(QUEUE_KEY, []);
}

function writeQueue(rows: QueuedNotify[]) {
  writePersistedJson(QUEUE_KEY, rows.slice(-80));
}

function anyChannelOn(page: BookingPage, event: BookingNotifyEvent) {
  return enabledNotifyChannels(
    notificationRowFor(page.notifyPrefs as NotificationRow[] | undefined, event),
  ).length > 0;
}

export function queueBookingLifecycleNotifies(page: BookingPage, booking: Booking) {
  const start = Date.parse(booking.start);
  const end = Date.parse(booking.end);
  const next = readQueue().filter(
    (row) => row.bookingId !== booking.id || row.sent,
  );
  if (anyChannelOn(page, "reminder") && Number.isFinite(start)) {
    const fire = new Date(start - 2 * 60 * 60 * 1000).toISOString();
    next.push({
      id: `rem-${booking.id}`,
      event: "reminder",
      bookingId: booking.id,
      pageId: page.id,
      fireAt: fire,
    });
  }
  if (anyChannelOn(page, "followup") && Number.isFinite(end)) {
    next.push({
      id: `fol-${booking.id}`,
      event: "followup",
      bookingId: booking.id,
      pageId: page.id,
      fireAt: new Date(end + 60 * 60 * 1000).toISOString(),
    });
  }
  writeQueue(next);
}

export function cancelQueuedBookingNotifies(bookingId: string) {
  writeQueue(readQueue().filter((row) => row.bookingId !== bookingId));
}

export async function flushDueBookingNotifications(now = new Date()) {
  const queue = readQueue();
  if (queue.length === 0) return;
  const stamp = now.getTime();
  const leftover: QueuedNotify[] = [];
  for (const item of queue) {
    if (item.sent) continue;
    if (Date.parse(item.fireAt) > stamp) {
      leftover.push(item);
      continue;
    }
    const booking = getBookingById(item.bookingId);
    const page = getBookingPageById(item.pageId);
    if (
      !booking ||
      !page ||
      booking.status === "Cancelled" ||
      (item.event === "reminder" && booking.status === "Completed")
    ) {
      continue;
    }
    try {
      await dispatchBookingNotifications({
        event: item.event,
        page,
        booking,
      });
    } catch {
      leftover.push(item);
      continue;
    }
  }
  writeQueue(leftover);
}

export async function sendNotifyTest(input: {
  channel: NotifyChannel;
  row: NotificationRow;
  email?: string;
  phone?: string;
}) {
  const tokens: NotifyTokens = {
    name: "Test guest",
    firstName: "Test",
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    datetime: "tomorrow 10:00 AM",
    location: "Online",
    title: input.row.title,
    timezone: "Australia/Sydney",
    owner: "FinConnex",
    ownerEmail: "",
  };
  if (input.channel === "Email") {
    const email = input.email?.trim() || "";
    if (!looksLikeEmail(email)) throw new Error("Enter a test email address");
    await sendEmailSafe(
      email,
      interpolateNotify(input.row.emailSubject, tokens),
      interpolateNotify(input.row.emailBody, tokens),
    );
    return;
  }
  if (input.channel === "SMS" || input.channel === "WhatsApp") {
    const phone = input.phone?.trim() || "";
    if (!looksLikePhone(phone)) throw new Error("Enter a test phone with country code");
    const body = interpolateNotify(input.row.smsBody, tokens);
    if (input.channel === "SMS") await sendSmsSafe(phone, body);
    else await sendWhatsAppSafe(phone, body, "Test guest");
    return;
  }
  pushInApp({
    type: "Meeting Reminder",
    title: input.row.title,
    message: interpolateNotify(input.row.smsBody, tokens),
    recipient: "You",
    relatedTo: "Test guest",
    relatedHref: "/booking",
  });
}
