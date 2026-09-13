import type { Email } from "@/lib/emails/types";
import { htmlToPlainText } from "@/lib/emails/ai-compose";
import {
  prepareEmailPayload,
  type EmailOutboundAttachment,
} from "@/lib/emails/attach-files";

/**
 * Sends the MIME message (HTML + files) through this app's mail route.
 * CRM `/send` still records the email; this path is what actually includes
 * attachments and inline images.
 */
export async function deliverQueuedCrmEmail(
  email: Email | null,
  extra?: { html?: string; files?: File[] },
): Promise<void> {
  if (!email?.to[0]) return;
  if (typeof window === "undefined") return;
  const html = extra?.html?.trim() || email.body || "";
  const files = extra?.files ?? [];
  const hasRich =
    files.length > 0 ||
    /<img\b/i.test(html) ||
    /data:image\//i.test(html);
  if (!hasRich) return;

  let outbound: EmailOutboundAttachment[] = [];
  let nextHtml = html;
  try {
    const prepared = await prepareEmailPayload({ html, files });
    outbound = prepared.outbound;
    nextHtml = prepared.html;
  } catch {
    outbound = [];
  }

  const res = await fetch("/api/auth/mail/deliver", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      text: htmlToPlainText(html) || email.body,
      html: nextHtml,
      attachments: outbound,
    }),
  });
  if (res.status === 503) return;
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error || "Could not deliver attachments with this email.");
  }
}
