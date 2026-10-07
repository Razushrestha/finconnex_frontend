import { publicManageUrl, publicRescheduleUrl } from "@/lib/booking/types";
import {
  emailBrandFromValues,
  emailFillStyle,
  type EmailBrand,
} from "@/lib/emails/brand-mail";

const INK = "#111827";
const MUTED = "#4B5563";
const LINE = "#E5E7EB";

export function nextBookingRef() {
  const key = "booking:ref-seq:v1";
  let n = 1;
  if (typeof window !== "undefined") {
    try {
      n = Number(window.localStorage.getItem(key) || "0") + 1;
      window.localStorage.setItem(key, String(n));
    } catch {
      n = (Date.now() % 90000) + 1;
    }
  }
  return `NE-${String(n).padStart(5, "0")}`;
}

export function bookingConfirmEmailHtml(input: {
  guestName: string;
  hostName: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  timezoneLabel: string;
  reference: string;
  joinUrl?: string;
  slug: string;
  manageToken: string;
  origin?: string;
  workspaceName?: string;
  /** Extra Invite Guest(s) recipient — they get the details, not manage links. */
  invited?: boolean;
  brand?: EmailBrand;
}): { subject: string; html: string; text: string } {
  const brand = input.brand ?? emailBrandFromValues(null);
  const fill = emailFillStyle(brand);
  const accent = brand.primary;
  const origin = (input.origin ?? "").replace(/\/$/, "");
  const reschedule = `${origin}${publicRescheduleUrl(input.slug, input.manageToken)}`;
  const manage = `${origin}${publicManageUrl(input.slug, input.manageToken)}`;
  const joinText = input.joinUrl ? `Join meeting: ${input.joinUrl}\n\n` : "";
  const greeting = input.invited
    ? "Hi there!"
    : `Hi there, ${escapeHtml(input.guestName)} !`;
  const intro = input.invited
    ? `<strong>${escapeHtml(input.guestName)}</strong> invited you to an appointment with <strong>${escapeHtml(input.hostName)}</strong> for <strong>${escapeHtml(input.title)}</strong> on <strong>${escapeHtml(input.dateLabel)}</strong> at <strong>${escapeHtml(input.timeLabel)}</strong> (${escapeHtml(input.timezoneLabel)})`
    : `You've scheduled an appointment with <strong>${escapeHtml(input.hostName)}</strong> for <strong>${escapeHtml(input.title)}</strong> on <strong>${escapeHtml(input.dateLabel)}</strong> at <strong>${escapeHtml(input.timeLabel)}</strong> (${escapeHtml(input.timezoneLabel)})`;
  const introText = input.invited
    ? `${input.guestName} invited you to an appointment with ${input.hostName} for ${input.title} on ${input.dateLabel} at ${input.timeLabel} (${input.timezoneLabel})`
    : `You've scheduled an appointment with ${input.hostName} for ${input.title} on ${input.dateLabel} at ${input.timeLabel} (${input.timezoneLabel})`;
  const manageHtml = input.invited
    ? ""
    : `<p style="font-size:14px;line-height:1.6;margin:24px 0 0;color:${MUTED};">Something amiss? You can always <a href="${escapeHtml(reschedule)}" style="color:${accent};">reschedule</a> or <a href="${escapeHtml(manage)}" style="color:${accent};">cancel</a> your appointment.</p>`;
  const manageText = input.invited
    ? ""
    : `Something amiss? Reschedule: ${reschedule}\nCancel: ${manage}\n\n`;
  const headerName = input.workspaceName?.trim() || input.hostName;
  const actionUrl = input.joinUrl || (input.invited ? "" : manage);
  const actionLabel = input.joinUrl ? "Join meeting" : "Manage appointment";
  const actionBlock = actionUrl
    ? `<p style="margin:16px 0;font-size:14px;line-height:1.55;color:${MUTED};">Use the button to open this appointment. This link is unique to you and should not be shared with anyone.</p>
    <p style="margin:0 0 18px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;${fill}color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;padding:14px 18px;">${actionLabel}</a></p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${MUTED};">If the button does not work, copy and paste this URL into your browser:</p>
    <div style="border:1px solid ${LINE};border-radius:8px;padding:12px 14px;font-size:12px;line-height:1.5;color:${accent};word-break:break-all;">${escapeHtml(actionUrl)}</div>`
    : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:${INK};max-width:560px;margin:0 auto;background:#ffffff;">
  <div style="${fill}color:#ffffff;padding:22px 24px;">
    <div style="font-size:11px;letter-spacing:1.4px;font-weight:700;opacity:0.85;">FINCONNEX</div>
    <div style="margin-top:6px;font-size:26px;font-weight:800;line-height:1.2;">${escapeHtml(headerName)}</div>
  </div>
  <div style="padding:22px 24px 8px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.5;">${greeting}</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">${intro}</p>
    <div style="margin:0 0 10px;font-size:12px;letter-spacing:1.2px;font-weight:700;color:${accent};">APPOINTMENT</div>
    <div style="border:1px solid ${LINE};border-radius:10px;padding:14px 16px;margin:0 0 10px;">
      <div style="font-size:15px;font-weight:700;color:${INK};">${escapeHtml(input.title)}</div>
      <div style="margin-top:4px;font-size:13px;line-height:1.45;color:${MUTED};">With ${escapeHtml(input.hostName)}</div>
      <div style="margin-top:4px;font-size:13px;line-height:1.45;color:${MUTED};">${escapeHtml(input.dateLabel)} at ${escapeHtml(input.timeLabel)}</div>
      <div style="margin-top:4px;font-size:13px;line-height:1.45;color:${MUTED};">${escapeHtml(input.timezoneLabel)}</div>
    </div>
    <div style="border:1px solid ${LINE};border-radius:10px;padding:14px 16px;margin:0 0 10px;">
      <div style="font-size:15px;font-weight:700;color:${INK};">Booking reference</div>
      <div style="margin-top:4px;font-size:13px;line-height:1.45;color:${MUTED};">Number is:<strong style="color:${INK};">${escapeHtml(input.reference)}</strong>.</div>
    </div>
    ${actionBlock}
    ${manageHtml}
    <div style="margin-top:16px;border:1px solid ${LINE};border-radius:10px;padding:14px 16px;">
      <div style="font-size:11px;letter-spacing:1.2px;font-weight:700;color:${accent};">QUESTIONS</div>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${MUTED};">If you have any questions, contact your assigned consultant directly.</p>
    </div>
    <p style="margin:22px 0 0;font-size:15px;line-height:1.5;">See you soon,<br/><strong>${escapeHtml(input.hostName)}</strong></p>
    <p style="font-size:12px;color:#94a3b8;margin:16px 0 8px">${escapeHtml(input.workspaceName || "FinConnex")}<br/>Powered by FinConnex Bookings</p>
  </div>
</div>`;
  const text = `${input.invited ? "Hi there!" : `Hi there, ${input.guestName} !`}

${introText}

Number is: ${input.reference}.
${joinText}${manageText}See you soon,
${input.hostName}`;
  return {
    subject: input.invited
      ? `You're invited: ${input.title} on ${input.dateLabel}`
      : `Appointment confirmed: ${input.title} on ${input.dateLabel}`,
    html,
    text,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
