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
  bookingLocationLabel,
  formatTime,
  getBookingById,
  getBookingPageById,
  parseLocalDateTime,
  publicBookUrl,
  publicManageUrl,
  type Booking,
  type BookingPage,
} from "@/lib/booking/types";
import { bookingConfirmEmailHtml } from "@/lib/booking/guest-confirm-email";
import { resolveEmailRouting } from "@/lib/booking/email-config";
import {
  formatDatePattern,
  minutesLabel,
  normalizeDateFormat,
} from "@/lib/booking/notify-variables";
import { loadSettingsValues } from "@/lib/settings/settings-store";
import { listAssignableOwnersLocal } from "@/lib/users/assignable";
import { silentRequest } from "@/lib/notify/fetch-notifier";
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

async function sendEmailSafe(
  email: string,
  subject: string,
  body: string,
  opts?: { html?: string; text?: string; cc?: string[]; replyTo?: string },
): Promise<void> {
  if (!looksLikeEmail(email)) return;
  const onPublicBook =
    typeof window !== "undefined" &&
    /^\/book(\/|$)/i.test(window.location.pathname);

  // Public /book must not depend on a host CRM cookie — SendGrid via a
  // dedicated route. Failures used to be swallowed by sendEmailDemoLive.
  if (onPublicBook && typeof window !== "undefined") {
    const res = await fetch(
      "/api/book/confirm-mail",
      silentRequest({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.trim(),
          subject: subject.trim() || "Appointment update",
          html: opts?.html?.trim() || body.trim() || subject,
          text: opts?.text?.trim() || body.trim() || subject,
          ...(opts?.cc?.length ? { cc: opts.cc } : {}),
          ...(opts?.replyTo ? { replyTo: opts.replyTo } : {}),
        }),
      }),
    );
    const json = (await res.json().catch(() => ({}))) as {
      delivered?: unknown;
    };
    if (!res.ok || json.delivered !== "sendgrid") {
      throw new Error("Could not send the confirmation email.");
    }
    return;
  }

  const result = await sendEmailDemoLive({
    email,
    subject: subject.trim() || "Appointment update",
    body: body.trim() || subject,
    cc: opts?.cc,
    replyTo: opts?.replyTo,
  });
  if (!result.ok) {
    throw new Error(result.message || "Could not send email");
  }
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

/** The site's address for links in a message; empty outside a browser. */
function currentOrigin() {
  return typeof window !== "undefined" ? (window.location?.origin ?? "") : "";
}

function lastNameOf(name: string) {
  return name.trim().split(/\s+/).slice(1).join(" ");
}

/** Company name, phone and address from Settings → Company Profile. */
function businessProfile() {
  try {
    const values = loadSettingsValues("organization/company-profile");
    const text = (key: string) =>
      typeof values[key] === "string" ? (values[key] as string).trim() : "";
    return {
      name: text("companyName"),
      phone: text("phone"),
      address: text("address"),
    };
  } catch {
    return { name: "", phone: "", address: "" };
  }
}

/** The assigned staff member's directory entry, if the CRM knows them. */
function staffRecord(page: BookingPage) {
  const wanted = (page.consultants?.[0] || page.owner || "").trim().toLowerCase();
  if (!wanted) return undefined;
  try {
    return listAssignableOwnersLocal().find(
      (owner) =>
        owner.name.trim().toLowerCase() === wanted ||
        owner.email.trim().toLowerCase() === wanted,
    );
  } catch {
    return undefined;
  }
}

/** The location line plus the join link, e.g. "Video · Zoom: https://…". */
function meetingInfoFor(page: BookingPage, booking: Booking) {
  const label = bookingLocationLabel(page);
  const url = booking.joinUrl || page.videoLink || "";
  return url && !label.includes(url) ? `${label}: ${url}` : label;
}

/**
 * Everything a notification template can mention for one booking. Dates are
 * written in `dateFormat` (one of the styles in `DATE_FORMATS`).
 */
export function notifyTokensFor(
  page: BookingPage,
  booking: Booking,
  opts: { dateFormat?: string; origin?: string } = {},
): NotifyTokens {
  const format = normalizeDateFormat(opts.dateFormat);
  const origin = (opts.origin ?? currentOrigin()).replace(/\/$/, "");
  const start = parseLocalDateTime(booking.start);
  const end = parseLocalDateTime(booking.end);
  const fromDate = formatDatePattern(start, format);
  const toDate = formatDatePattern(end, format);
  const timeRange = `${formatTime(booking.start)} - ${formatTime(booking.end)}`;
  const business = businessProfile();
  const staff = staffRecord(page);
  const ownerName = page.consultants?.[0] || page.owner;
  const serviceUrl = `${origin}${publicBookUrl(page.slug)}`;
  return {
    name: booking.guestName,
    firstName: firstNameOf(booking.guestName),
    lastName: lastNameOf(booking.guestName),
    email: booking.guestEmail,
    phone: booking.guestPhone ?? "",
    datetime: `${fromDate} · ${timeRange}`,
    location:
      booking.joinUrl ||
      page.meetingViaDetail ||
      page.location ||
      page.videoLink ||
      "Meeting",
    title: page.title,
    timezone: page.timezone,
    owner: ownerName,
    ownerEmail: looksLikeEmail(page.owner) ? page.owner : "",
    staffEmail: staff?.email || (looksLikeEmail(page.owner) ? page.owner : ""),
    staffPhone: looksLikePhone(page.owner) ? page.owner.trim() : "",
    staffId: staff && staff.id !== staff.name ? staff.id : "",
    // The CRM keeps no staff bio and no workspace-level booking page, so
    // `staffInfo` and `workspaceUrl` stay empty rather than show made-up text.
    joinUrl: booking.joinUrl || page.videoLink,
    reference: booking.reference,
    businessName: business.name,
    businessPhone: business.phone,
    businessAddress: business.address,
    serviceUrl,
    serviceDescription: page.description?.trim() ?? "",
    bufferBefore: minutesLabel(page.bufferMinutes),
    bufferAfter: minutesLabel(page.schedulingRules?.postBufferMinutes),
    appointmentId: booking.id,
    appointmentTime: timeRange,
    fromDate,
    toDate,
    bookingId: booking.reference || booking.id,
    summaryUrl: `${origin}${publicManageUrl(page.slug, booking.manageToken)}`,
    bookNowUrl: serviceUrl,
    meetingInfo: meetingInfoFor(page, booking),
  };
}

export function confirmEmailCopy(
  page: BookingPage,
  booking: Booking,
  dateFormat?: string,
) {
  const start = parseLocalDateTime(booking.start);
  const dateLabel = formatDatePattern(start, normalizeDateFormat(dateFormat));
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
  const origin = currentOrigin();
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
}): Promise<{ channels: NotifyChannel[]; emailError?: string }> {
  const row = notificationRowFor(
    input.page.notifyPrefs as NotificationRow[] | undefined,
    input.event,
  );
  const channels = enabledNotifyChannels(row);
  if (channels.length === 0) return { channels: [] };

  const tokens = notifyTokensFor(input.page, input.booking, {
    dateFormat: row.dateFormat,
  });
  const subject = interpolateNotify(row.emailSubject, tokens);
  const emailBody = interpolateNotify(row.emailBody, tokens);
  const smsBody = interpolateNotify(row.smsBody, tokens);
  const href = `/book/${input.page.slug}/manage/${input.booking.manageToken}`;
  const contact = row.notifyContact !== false;
  const user = Boolean(row.notifyUser);

  const tasks: Array<Promise<unknown>> = [];
  const emailTasks: Array<Promise<unknown>> = [];

  if (channels.includes("Email")) {
    // Reply To / Cc from the page's Email Configurations, per audience.
    const routing = (audience: "customer" | "user", to: string) =>
      resolveEmailRouting(input.page.emailNotifyConfig, audience, {
        to,
        staffEmail: tokens.staffEmail || tokens.ownerEmail,
        customerEmail: tokens.email,
      });
    if (contact) {
      const route = routing("customer", tokens.email);
      if (input.event === "confirmed") {
        const copy = confirmEmailCopy(input.page, input.booking, row.dateFormat);
        emailTasks.push(
          sendEmailSafe(tokens.email, copy.subject, copy.html, {
            html: copy.html,
            text: copy.text,
            ...route,
          }),
        );
      } else {
        emailTasks.push(sendEmailSafe(tokens.email, subject, emailBody, route));
      }
    }
    if (user && tokens.ownerEmail) {
      emailTasks.push(
        sendEmailSafe(
          tokens.ownerEmail,
          subject,
          emailBody,
          routing("user", tokens.ownerEmail),
        ),
      );
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

  const emailSettled = await Promise.allSettled(emailTasks);
  await Promise.allSettled(tasks);
  const emailFailure = emailSettled.find(
    (row): row is PromiseRejectedResult => row.status === "rejected",
  );
  const emailError = emailFailure
    ? "Could not send the confirmation email."
    : undefined;
  return { channels, emailError };
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

/**
 * Made-up booking details for "Send test", so every variable shows something
 * and dates follow the notification's chosen format. `now` is the test day.
 */
export function sampleNotifyTokens(
  row: Pick<NotificationRow, "title" | "dateFormat">,
  now: Date = new Date(),
  contact: { email?: string; phone?: string } = {},
): NotifyTokens {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const date = formatDatePattern(day, normalizeDateFormat(row.dateFormat));
  const time = "10:00 AM - 10:30 AM";
  const origin = currentOrigin();
  return {
    name: "Test guest",
    firstName: "Test",
    lastName: "Guest",
    email: contact.email?.trim() || "",
    phone: contact.phone?.trim() || "",
    datetime: `${date} · ${time}`,
    location: "Online",
    title: row.title,
    timezone: "Australia/Sydney",
    owner: "FinConnex",
    ownerEmail: "",
    staffEmail: "staff@example.com",
    staffPhone: "+61 400 000 000",
    staffId: "STAFF-001",
    // staffInfo and workspaceUrl stay empty, exactly as in a real send.
    businessName: "FinConnex",
    businessPhone: "+61 2 9000 0000",
    businessAddress: "Level 12, 100 Pitt Street, Sydney NSW 2000",
    serviceUrl: `${origin}/book/sample`,
    serviceDescription: "Sample service description",
    bufferBefore: "10 minutes",
    bufferAfter: "5 minutes",
    appointmentId: "bk-sample",
    appointmentTime: time,
    fromDate: date,
    toDate: date,
    bookingId: "NE-00001",
    summaryUrl: `${origin}/book/sample/manage/sample`,
    bookNowUrl: `${origin}/book/sample`,
    meetingInfo: "Video · Zoom",
  };
}

export async function sendNotifyTest(input: {
  channel: NotifyChannel;
  row: NotificationRow;
  email?: string;
  phone?: string;
}) {
  const tokens = sampleNotifyTokens(input.row, new Date(), {
    email: input.email,
    phone: input.phone,
  });
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
