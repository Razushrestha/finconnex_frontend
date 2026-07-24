/**
 * Real contact intents for Lead Card quick actions (tel / sms / mailto).
 */

export function normalizePhoneForTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/** Open device dialer for the lead phone. */
export function openCallIntent(phone?: string): { ok: true } | { ok: false; message: string } {
  const tel = phone ? normalizePhoneForTel(phone) : "";
  if (!tel) return { ok: false, message: "This lead has no phone number." };
  if (typeof window !== "undefined" && window.location) {
    window.location.href = `tel:${tel}`;
  }
  return { ok: true };
}

/** Open SMS composer (body optional). */
export function openSmsIntent(
  phone?: string,
  body?: string,
): { ok: true } | { ok: false; message: string } {
  const tel = phone ? normalizePhoneForTel(phone) : "";
  if (!tel) return { ok: false, message: "This lead has no phone number." };
  const params = body?.trim()
    ? `?body=${encodeURIComponent(body.trim())}`
    : "";
  if (typeof window !== "undefined" && window.location) {
    window.location.href = `sms:${tel}${params}`;
  }
  return { ok: true };
}

/** Open default mail client. */
export function openEmailIntent(
  email?: string,
  opts?: { subject?: string; body?: string },
): { ok: true } | { ok: false; message: string } {
  const to = email?.trim() ?? "";
  if (!to || !to.includes("@")) {
    return { ok: false, message: "This lead has no email address." };
  }
  const q = new URLSearchParams();
  if (opts?.subject?.trim()) q.set("subject", opts.subject.trim());
  if (opts?.body?.trim()) q.set("body", opts.body.trim());
  const qs = q.toString();
  if (typeof window !== "undefined" && window.location) {
    window.location.href = `mailto:${to}${qs ? `?${qs}` : ""}`;
  }
  return { ok: true };
}
