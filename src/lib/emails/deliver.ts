import { isBoundCrmSession } from "@/lib/activity-timeline/auth";
import type { Email } from "@/lib/emails/types";

export async function deliverAppMail(input: {
  to?: string[];
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
}): Promise<void> {
  if (typeof window === "undefined" || isBoundCrmSession()) return;
  const to = (input.to ?? []).map((item) => item.trim()).filter(Boolean);
  const subject = input.subject?.trim() ?? "";
  const text = input.body?.trim() || subject;
  if (!to[0] || !subject) {
    throw new Error("Email is missing a recipient or subject");
  }
  const res = await fetch("/api/auth/mail/deliver", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      subject,
      text,
      cc: input.cc,
      bcc: input.bcc,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `Email was queued but not delivered (${res.status})`);
  }
}

export async function deliverQueuedCrmEmail(email: Email | null) {
  if (!email) return;
  await deliverAppMail({
    to: email.to,
    subject: email.subject,
    body: email.body,
    cc: email.cc,
    bcc: email.bcc,
  });
}
