import "server-only";

import { crmBaseUrl } from "@/lib/auth/crm-server";

export type DeliverInput = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  /** Where a reply goes. The sender itself is always the configured SendGrid sender. */
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    type?: string;
    content: string;
    disposition?: "attachment" | "inline";
    contentId?: string;
  }>;
};

function addresses(list?: string[]) {
  const seen = new Set<string>();
  const out: Array<{ email: string }> = [];
  for (const item of list ?? []) {
    const email = item.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    out.push({ email: item.trim() });
  }
  return out;
}

/** SendGrid wants raw base64, no data: prefix or whitespace. */
export function sendgridBase64(content: string): string {
  const trimmed = content.trim();
  const dataUrl = trimmed.match(/^data:[^;]+;base64,([\s\S]+)$/i);
  const raw = dataUrl?.[1] ?? trimmed;
  return raw.replace(/\s+/g, "");
}

export function sendgridConfigured() {
  const key = process.env.SENDGRID_API_KEY?.trim() ?? "";
  const from = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "";
  return Boolean(key && from.includes("@"));
}

function mapAttachments(input: DeliverInput["attachments"]) {
  return (input ?? [])
    .filter((row) => row.content && row.filename)
    .map((row) => {
      const content = sendgridBase64(row.content);
      const contentId = row.contentId?.trim();
      const inline = row.disposition === "inline" && Boolean(contentId);
      const item: Record<string, string> = {
        content,
        filename: row.filename.replace(/[/\\]/g, "-").slice(0, 200) || "file",
        type: row.type?.trim() || "application/octet-stream",
        disposition: inline ? "inline" : "attachment",
      };
      if (inline && contentId) item.content_id = contentId;
      return item;
    })
    .filter((row) => row.content.length > 0);
}

export async function sendViaSendGrid(input: DeliverInput): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim() ?? "";
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "";
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || "FinConnex";
  const to = addresses(input.to);
  if (!apiKey || !fromEmail.includes("@")) {
    throw new Error(
      "SendGrid is not configured on this app. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in .env.local.",
    );
  }
  if (!to[0]) {
    throw new Error("Add a recipient email address");
  }
  const subject = input.subject.trim();
  const text = input.text.trim() || subject;
  if (!subject) {
    throw new Error("Subject is required");
  }

  const used = new Set(to.map((row) => row.email.toLowerCase()));
  const cc = addresses(input.cc).filter((row) => {
    const key = row.email.toLowerCase();
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });
  const bcc = addresses(input.bcc).filter((row) => {
    const key = row.email.toLowerCase();
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });

  const personalization: Record<string, unknown> = { to };
  if (cc.length) personalization.cc = cc;
  if (bcc.length) personalization.bcc = bcc;

  const content: Array<{ type: string; value: string }> = [
    { type: "text/plain", value: text },
  ];
  const html = input.html?.trim();
  if (html) content.push({ type: "text/html", value: html });

  const attachments = mapAttachments(input.attachments);
  const payload: Record<string, unknown> = {
    personalizations: [personalization],
    from: { email: fromEmail, name: fromName },
    subject,
    content,
  };
  if (attachments.length) payload.attachments = attachments;
  const replyTo = addresses([input.replyTo ?? ""])[0];
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 202 || res.status === 200) return;

  let detail = `SendGrid rejected the message (${res.status})`;
  try {
    const json = (await res.json()) as {
      errors?: Array<{ message?: string; field?: string }>;
    };
    const parts = (json.errors ?? [])
      .map((item) => {
        const msg = item.message?.trim();
        if (!msg) return "";
        return item.field ? `${item.field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) detail = parts.join(" ");
  } catch {
    /* keep */
  }

  if (/maximum credits|credits exceeded/i.test(detail)) {
    throw new Error("SendGrid has no email credits left.");
  }
  if (res.status === 401 || /authorization|api key/i.test(detail)) {
    throw new Error(
      "SendGrid API key was rejected. Create a new Mail Send key and set SENDGRID_API_KEY in .env.local, then restart npm run dev.",
    );
  }
  if (/verified|sender identity|from address/i.test(detail)) {
    throw new Error(
      "SendGrid will not send until SENDGRID_FROM_EMAIL is a verified Single Sender or authenticated domain in the SendGrid dashboard.",
    );
  }
  throw new Error(detail);
}

/**
 * How the CRM may be asked to send when this app has no SendGrid key: as the
 * signed-in user, or as the guest holding a booking's manage token.
 */
export type CrmMailAuth = { accessToken?: string | null; bookingToken?: string | null };

async function deliverViaCrm(input: DeliverInput, auth: CrmMailAuth): Promise<"crm"> {
  const base = crmBaseUrl();
  const bookingToken = auth.bookingToken?.trim();
  const accessToken = auth.accessToken?.trim();
  if (!base || (!bookingToken && !accessToken)) {
    throw new Error(
      "Email is not configured on this app. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, or sign in so the CRM can send it.",
    );
  }
  const emails = (list?: string[]) => addresses(list).map((row) => row.email);
  const to = emails(input.to);
  if (!to[0]) throw new Error("Add a recipient email address");
  const subject = input.subject.trim();
  if (!subject) throw new Error("Subject is required");

  const body = {
    to,
    cc: emails(input.cc),
    bcc: emails(input.bcc),
    ...(addresses([input.replyTo ?? ""])[0]
      ? { replyTo: addresses([input.replyTo ?? ""])[0].email }
      : {}),
    subject,
    text: input.text.trim() || subject,
    ...(input.html?.trim() ? { html: input.html.trim() } : {}),
    attachments: (input.attachments ?? [])
      .filter((row) => row.content && row.filename)
      .map((row) => ({
        filename: row.filename.slice(0, 200),
        type: row.type?.trim() || "application/octet-stream",
        content: sendgridBase64(row.content),
        ...(row.disposition === "inline" && row.contentId
          ? { disposition: "inline", contentId: row.contentId }
          : { disposition: "attachment" }),
      }))
      .filter((row) => row.content.length > 0),
  };
  const url = bookingToken
    ? `${base}/v1/public/booking/manage/${encodeURIComponent(bookingToken)}/mail`
    : `${base}/v1/mail/relay`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bookingToken ? {} : { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { message?: unknown };
    const message =
      typeof json.message === "string" && json.message.trim()
        ? json.message
        : `CRM mail failed (${res.status})`;
    throw new Error(message);
  }
  return "crm";
}

/**
 * Sends through the CRM's platform mail account (`POST /v1/mail/relay`), the
 * same sender and account that delivers sign-up and verification codes.
 */
export async function deliverThroughPlatformMailer(
  input: DeliverInput,
  accessToken: string,
): Promise<"crm"> {
  const token = accessToken.trim();
  if (!token) throw new Error("Sign in again so the CRM can send this email.");
  return deliverViaCrm(input, { accessToken: token });
}

/**
 * The sender booking confirmations use when this app cannot send itself:
 * the workspace mailbox behind the booking's manage token. SendGrid is not
 * called.
 */
export async function deliverThroughBookingMailbox(
  input: DeliverInput,
  bookingToken: string,
): Promise<"crm"> {
  const token = bookingToken.trim();
  if (!token) throw new Error("The booking mailbox did not return a send token.");
  return deliverViaCrm(input, { bookingToken: token });
}

/**
 * Sends through this app's own SendGrid key when one is set. When that account
 * cannot send (for example it is out of credits), the same HTML goes through
 * the CRM mailbox instead of being dropped for a plain-text copy.
 */
export async function deliverMail(
  input: DeliverInput,
  auth: CrmMailAuth = {},
): Promise<"sendgrid" | "crm"> {
  if (sendgridConfigured()) {
    try {
      await sendViaSendGrid(input);
      return "sendgrid";
    } catch (error) {
      const canUseCrm = Boolean(auth.accessToken?.trim() || auth.bookingToken?.trim());
      if (!canUseCrm) throw error;
      const reason = error instanceof Error ? error.message : "SendGrid rejected the message";
      console.error(`[mail] SendGrid did not send (${reason}). Sending the HTML through the CRM mailbox.`);
    }
  }
  return deliverViaCrm(input, auth);
}
