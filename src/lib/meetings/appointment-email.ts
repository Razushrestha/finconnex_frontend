import { dateInTimezone, ianaTimezoneFromLabel } from "@/lib/booking/timezones";
import {
  emailBrandFromValues,
  emailFillStyle,
  type EmailBrand,
} from "@/lib/emails/brand-mail";

const ORG = "Finconnex Financial Services";
const EMAIL = "info@finconnex.com.au";
const INK = "#111827";
const MUTED = "#4B5563";
const LINE = "#E5E7EB";

export type AppointmentEmailInput = {
  guestName: string;
  hostName: string;
  title: string;
  /** YYYY-MM-DD in the appointment timezone. */
  dateIso: string;
  /** HH:mm in the appointment timezone. */
  startHHmm: string;
  durationMinutes: number;
  timeZoneLabel?: string;
  meetingType?: string;
  location?: string;
  joinUrl?: string;
  /** @deprecated Prefer rescheduleUrl and cancelUrl. */
  manageUrl?: string;
  rescheduleUrl?: string;
  cancelUrl?: string;
  brand?: EmailBrand;
};

export function appointmentConfirmedEmail(input: AppointmentEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const brand = input.brand ?? emailBrandFromValues(null);
  const fill = emailFillStyle(brand);
  const accent = brand.primary;
  const guest = firstName(input.guestName);
  const host = input.hostName.trim() || "your consultant";
  const dateLabel = formatLongDate(input.dateIso);
  const timeLabel = formatTimeRange(input.startHHmm, input.durationMinutes);
  const meetingType = meetingTypeLabel(input);
  const joinUrl = input.joinUrl?.trim();
  const online = isOnline(input, meetingType);
  const meetingDetail = joinUrl
    ? `<a href="${escapeHtml(joinUrl)}" style="color:${accent};text-decoration:none">${escapeHtml(joinUrl)}</a>`
    : online
      ? "A meeting link will be sent separately to your email."
      : escapeHtml(input.location?.trim() || "");
  const calendarUrl = googleCalendarUrl(input, dateLabel, timeLabel);
  const fallback = input.manageUrl?.trim();
  const rescheduleUrl =
    input.rescheduleUrl?.trim() ||
    fallback ||
    `mailto:${EMAIL}?subject=${encodeURIComponent(`Reschedule: ${input.title}`)}`;
  const cancelUrl =
    input.cancelUrl?.trim() ||
    fallback ||
    `mailto:${EMAIL}?subject=${encodeURIComponent(`Cancel: ${input.title}`)}`;
  const subject = `Your appointment is confirmed`;
  const primaryUrl = joinUrl || calendarUrl;
  const buttonStyle = `display:inline-block;${fill}color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:8px;padding:12px 14px;`;
  const actionButtons = [
    joinUrl ? { href: joinUrl, label: "Join meeting" } : null,
    { href: calendarUrl, label: "Add to Calendar" },
    { href: rescheduleUrl, label: "Reschedule" },
    { href: cancelUrl, label: "Cancel" },
  ].filter((button): button is { href: string; label: string } => Boolean(button));
  const actionRow = actionButtons
    .map(
      (button, index) =>
        `<td style="padding:0 ${index < actionButtons.length - 1 ? "8px" : "0"} 0 0;"><a href="${escapeHtml(button.href)}" style="${buttonStyle}">${button.label}</a></td>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;">
<div style="font-family:Arial,Helvetica,sans-serif;color:${INK};max-width:560px;margin:0 auto;background:#ffffff;">
  <div style="${fill}color:#ffffff;padding:22px 24px;">
    <div style="font-size:11px;letter-spacing:1.4px;font-weight:700;opacity:0.85;">FINCONNEX</div>
    <div style="margin-top:6px;font-size:26px;font-weight:800;line-height:1.2;">${escapeHtml(host)}</div>
  </div>
  <div style="padding:22px 24px 8px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.5;">Hi ${escapeHtml(guest)},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;"><strong>${escapeHtml(host)}</strong> has confirmed your <strong>${escapeHtml(input.title.trim() || "appointment")}</strong> appointment.</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:${MUTED};">Your appointment has been successfully booked. We look forward to speaking with you.</p>
    <div style="margin:0 0 10px;font-size:12px;letter-spacing:1.2px;font-weight:700;color:${accent};">APPOINTMENT</div>
    ${detailCard("Date", escapeHtml(dateLabel))}
    ${detailCard("Time", escapeHtml(timeLabel))}
    ${detailCard("With", escapeHtml(host), escapeHtml(ORG))}
    ${detailCard("Meeting type", escapeHtml(meetingType), meetingDetail)}
    <p style="margin:16px 0;font-size:14px;line-height:1.55;color:${MUTED};">Use the buttons for this appointment. These links are unique to you and should not be shared with anyone.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr>
        ${actionRow}
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${MUTED};">If a button does not work, copy and paste this URL into your browser:</p>
    <div style="border:1px solid ${LINE};border-radius:8px;padding:12px 14px;font-size:12px;line-height:1.5;color:${accent};word-break:break-all;">${escapeHtml(primaryUrl)}</div>
    <div style="margin-top:16px;border:1px solid ${LINE};border-radius:10px;padding:14px 16px;">
      <div style="font-size:11px;letter-spacing:1.2px;font-weight:700;color:${accent};">QUESTIONS</div>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${MUTED};">If you have any questions, contact your assigned consultant directly.</p>
    </div>
    <p style="margin:22px 0 8px;font-size:15px;line-height:1.5;">Regards,<br/><strong>FinconneX</strong></p>
  </div>
</div>
</body>
</html>`;

  const text = [
    `Hi ${guest},`,
    "",
    "Your appointment has been successfully booked.",
    "",
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `With: ${host}`,
    `Meeting type: ${meetingType}`,
    joinUrl ? `Join meeting: ${joinUrl}` : online ? "A meeting link will be sent separately to your email." : input.location?.trim() || "",
    "",
    `Add to calendar: ${calendarUrl}`,
    `Reschedule: ${rescheduleUrl}`,
    `Cancel: ${cancelUrl}`,
    "",
    `Regards,`,
    "FinconneX",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

function firstName(name: string) {
  const part = name.trim().split(/\s+/)[0];
  return part || "there";
}

function formatLongDate(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  if (!year || !month || !day) return dateIso;
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function detailCard(label: string, value: string, extra = "") {
  return `<div style="border:1px solid ${LINE};border-radius:10px;padding:14px 16px;margin:0 0 10px;">
  <div style="font-size:15px;font-weight:700;color:${INK};">${escapeHtml(label)}</div>
  <div style="margin-top:4px;font-size:13px;line-height:1.45;color:${MUTED};">${value}</div>
  ${extra ? `<div style="margin-top:4px;font-size:13px;line-height:1.45;color:${MUTED};">${extra}</div>` : ""}
</div>`;
}

function formatClock(totalMinutes: number) {
  const minutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatTimeRange(startHHmm: string, durationMinutes: number) {
  const [hour, minute] = startHHmm.split(":").map(Number);
  const start = (hour || 0) * 60 + (minute || 0);
  const length = durationMinutes > 0 ? durationMinutes : 60;
  return `${formatClock(start)} – ${formatClock(start + length)} (${durationPhrase(length)})`;
}

function durationPhrase(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours === 1 ? "1 hour" : `${hours} hours`} ${rest === 1 ? "1 minute" : `${rest} minutes`}`;
}

function isOnline(input: AppointmentEmailInput, meetingType: string) {
  const blob = `${input.meetingType ?? ""} ${input.location ?? ""} ${meetingType}`.toLowerCase();
  return (
    Boolean(input.joinUrl?.trim()) ||
    /video|online|meet|zoom|jitsi/.test(blob)
  );
}

function meetingTypeLabel(input: AppointmentEmailInput) {
  const blob = `${input.meetingType ?? ""} ${input.location ?? ""} ${input.joinUrl ?? ""}`.toLowerCase();
  if (blob.includes("zoom")) return "Online Meeting (Zoom)";
  if (blob.includes("meet.google") || blob.includes("google meet")) {
    return "Online Meeting (Google Meet)";
  }
  if (/video|online|jitsi|meet\.jit/.test(blob)) return "Online Meeting";
  if (blob.includes("phone")) return "Phone Call";
  if (blob.includes("person") || blob.includes("office")) return "In-person Meeting";
  return input.meetingType?.trim() || input.location?.trim() || "Online Meeting";
}

function googleCalendarUrl(
  input: AppointmentEmailInput,
  dateLabel: string,
  timeLabel: string,
) {
  const start = dateInTimezone(
    input.dateIso,
    input.startHHmm,
    input.timeZoneLabel,
  );
  const end = new Date(start.getTime() + Math.max(input.durationMinutes, 1) * 60 * 1000);
  const stamp = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const details = [
    `${dateLabel}`,
    timeLabel,
    `With ${input.hostName}`,
    input.joinUrl?.trim() ? `Join meeting: ${input.joinUrl.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title || "Appointment",
    dates: `${stamp(start)}/${stamp(end)}`,
    details,
    location: input.joinUrl?.trim() || input.location?.trim() || ORG,
    ctz: ianaTimezoneFromLabel(input.timeZoneLabel),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
