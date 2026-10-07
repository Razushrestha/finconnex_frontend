import { dateInTimezone, ianaTimezoneFromLabel } from "@/lib/booking/timezones";

const ORG = "Finconnex Financial Services";
const PHONE = "02 1234 5678";
const EMAIL = "info@finconnex.com.au";
const SITE = "https://www.finconnex.com.au";
const NAVY = "#102A56";
const BLUE = "#1D6FE8";
const MUTED = "#5C6B82";

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
};

export function appointmentConfirmedEmail(input: AppointmentEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const guest = firstName(input.guestName);
  const host = input.hostName.trim() || "your consultant";
  const dateLabel = formatLongDate(input.dateIso);
  const timeLabel = formatTimeRange(input.startHHmm, input.durationMinutes);
  const meetingType = meetingTypeLabel(input);
  const joinUrl = input.joinUrl?.trim();
  const online = isOnline(input, meetingType);
  const meetingDetail = joinUrl
    ? `<a href="${escapeHtml(joinUrl)}" style="color:${BLUE};text-decoration:none">${escapeHtml(joinUrl)}</a>`
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

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef3fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fb;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
      <tr><td style="padding:28px 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:26px;font-weight:800;letter-spacing:-0.4px;color:${NAVY};">Finconne<span style="color:${BLUE};">X</span></div>
              <div style="font-size:10px;letter-spacing:1.6px;color:#7B8BA3;font-weight:700;">FINANCIAL SERVICES</div>
            </td>
            <td align="right" style="border-left:3px solid ${BLUE};padding-left:12px;font-size:13px;color:#7B8BA3;">Your trusted<br/>finance partner</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:12px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8ff;border-radius:18px;">
          <tr>
            <td style="padding:28px 24px;" valign="middle">
              <div style="width:42px;height:42px;border-radius:21px;background:${BLUE};color:#ffffff;text-align:center;line-height:42px;font-size:22px;font-weight:700;">✓</div>
              <div style="font-size:28px;line-height:1.2;font-weight:800;margin-top:14px;color:${NAVY};">Your Appointment<br/>is Confirmed!</div>
              <p style="margin:14px 0 0;font-size:14px;line-height:1.5;color:${MUTED};">Hi ${escapeHtml(guest)},<br/>Your appointment has been successfully booked.<br/>We look forward to speaking with you.</p>
            </td>
            <td width="180" align="right" valign="middle" style="padding:16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #d7e4f7;">
                <tr><td style="background:${BLUE};color:#ffffff;font-size:12px;font-weight:700;text-align:center;padding:8px 18px;border-radius:16px 16px 0 0;">${escapeHtml(monthShort(input.dateIso))}</td></tr>
                <tr><td style="font-size:28px;font-weight:800;text-align:center;padding:10px 18px 4px;color:${NAVY};">${escapeHtml(dayNumber(input.dateIso))}</td></tr>
                <tr><td style="text-align:center;padding:0 18px 12px;color:${BLUE};font-size:18px;">✓</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:18px 24px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6eef8;border-radius:16px;">
          ${detailRow("Date", dateLabel)}
          ${detailRow("Time", timeLabel)}
          ${detailRow("With", `<strong>${escapeHtml(host)}</strong><br/><span style="color:${MUTED};font-weight:400;">${escapeHtml(ORG)}</span>`)}
          ${detailRow("Meeting Type", `<strong>${escapeHtml(meetingType)}</strong>${meetingDetail ? `<br/><span style="color:${MUTED};font-weight:400;">${meetingDetail}</span>` : ""}`, true)}
        </table>
      </td></tr>
      <tr><td style="padding:8px 24px;">
        <a href="${escapeHtml(calendarUrl)}" style="display:block;background:${BLUE};color:#ffffff;text-align:center;text-decoration:none;font-weight:700;font-size:15px;border-radius:10px;padding:14px 16px;">Add to Calendar</a>
      </td></tr>
      <tr><td style="padding:8px 24px 4px;">
        <a href="${escapeHtml(rescheduleUrl)}" style="display:block;background:#ffffff;color:${BLUE};text-align:center;text-decoration:none;font-weight:700;font-size:15px;border:1px solid #d5e2f5;border-radius:10px;padding:13px 16px;">Reschedule</a>
      </td></tr>
      <tr><td style="padding:4px 24px 4px;">
        <a href="${escapeHtml(cancelUrl)}" style="display:block;background:#ffffff;color:${BLUE};text-align:center;text-decoration:none;font-weight:700;font-size:15px;border:1px solid #d5e2f5;border-radius:10px;padding:13px 16px;">Cancel</a>
      </td></tr>
      <tr><td style="padding:14px 24px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7ff;border-radius:12px;">
          <tr><td style="padding:14px 16px;font-size:13px;line-height:1.5;color:${NAVY};">
            <strong>Need to make changes?</strong><br/>
            <span style="color:${MUTED};">You can reschedule or cancel your appointment anytime using the buttons above.</span>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 32px 8px;font-size:14px;line-height:1.6;color:${MUTED};">
        If you have any questions before the appointment, feel free to reach out to us.<br/><br/>
        Regards,<br/>
        <strong style="color:${NAVY};">${ORG}</strong>
      </td></tr>
      <tr><td style="padding:8px 24px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6eef8;">
          <tr>
            ${contactCell("Call Us", PHONE, `tel:${PHONE.replace(/\s/g, "")}`)}
            ${contactCell("Email Us", EMAIL, `mailto:${EMAIL}`)}
            ${contactCell("Visit Us", "www.finconnex.com.au", SITE)}
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
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
    ORG,
    `${PHONE} · ${EMAIL} · www.finconnex.com.au`,
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

function monthShort(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day)
    .toLocaleDateString("en-AU", { month: "short" })
    .toUpperCase();
}

function dayNumber(dateIso: string) {
  const day = Number(dateIso.split("-")[2]);
  return Number.isFinite(day) ? String(day) : "";
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

function detailRow(label: string, value: string, last = false) {
  return `<tr>
    <td style="padding:14px 18px;${last ? "" : "border-bottom:1px solid #eef2f7;"}font-size:13px;">
      <div style="color:${MUTED};margin-bottom:2px;">${escapeHtml(label)}</div>
      <div style="font-size:15px;font-weight:700;color:${NAVY};">${value}</div>
    </td>
  </tr>`;
}

function contactCell(label: string, value: string, href: string) {
  return `<td width="33%" style="padding:14px 8px 0;font-size:12px;line-height:1.4;">
    <div style="color:${BLUE};font-weight:700;">${escapeHtml(label)}</div>
    <a href="${escapeHtml(href)}" style="color:${NAVY};text-decoration:none;">${escapeHtml(value)}</a>
  </td>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
