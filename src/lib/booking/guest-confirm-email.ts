import { publicManageUrl, publicRescheduleUrl } from "@/lib/booking/types";

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
}): { subject: string; html: string; text: string } {
  const origin = (input.origin ?? "").replace(/\/$/, "");
  const reschedule = `${origin}${publicRescheduleUrl(input.slug, input.manageToken)}`;
  const manage = `${origin}${publicManageUrl(input.slug, input.manageToken)}`;
  const joinLine = input.joinUrl
    ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#111">Join meeting: <a href="${escapeHtml(input.joinUrl)}" style="color:#2563eb">${escapeHtml(input.joinUrl)}</a></p>`
    : "";
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
    : `<p style="font-size:14px;line-height:1.6;margin:24px 0 0">Something amiss? You can always <a href="${escapeHtml(reschedule)}" style="color:#2563eb">reschedule</a> or <a href="${escapeHtml(manage)}" style="color:#2563eb">cancel</a> your appointment.</p>`;
  const manageText = input.invited
    ? ""
    : `Something amiss? Reschedule: ${reschedule}\nCancel: ${manage}\n\n`;
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:8px 0">
<p style="font-size:18px;font-weight:700;margin:0 0 16px">${greeting}</p>
<p style="font-size:14px;line-height:1.6;margin:0">${intro}</p>
<p style="font-size:14px;margin:16px 0 0">Number is:<strong>${escapeHtml(input.reference)}</strong>.</p>
${joinLine}
${manageHtml}
<p style="font-size:14px;margin:28px 0 0">See you soon,</p>
<p style="font-size:14px;font-weight:700;margin:4px 0 0">${escapeHtml(input.hostName)}</p>
<p style="font-size:12px;color:#94a3b8;margin:20px 0 0">${escapeHtml(input.workspaceName || "FinConnex")}<br/>Powered by FinConnex Bookings</p>
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
