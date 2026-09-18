import { persistRemoteEmail, createCrmEmail, sendCrmEmail } from "@/lib/emails/api";
import { isEmailAddress } from "@/lib/emails/address";
import { prepareEmailPayload } from "@/lib/emails/attach-files";
import { createEmail } from "@/lib/emails/store";
import { deliverQueuedCrmEmail } from "@/lib/emails/deliver";
import type { Email } from "@/lib/emails/types";

function uniqueEmails(list: Array<string | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const email = raw?.trim();
    if (!email || !isEmailAddress(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

function isCrmAuthFailure(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /token unavailable|not authorized|sign in again|session has expired/i.test(
    msg,
  );
}

async function deliverThroughFinConnexMail(input: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
  relatedTo?: string;
  files?: File[];
}): Promise<Email> {
  const local = createEmail({
    subject: input.subject,
    body: input.body,
    from: "FinConnex",
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    relatedTo: input.relatedTo,
    status: "Sent",
  });
  const files = input.files ?? [];
  if (typeof window !== "undefined") {
    const res = await fetch("/api/auth/mail/deliver", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: local.to,
        cc: local.cc,
        bcc: local.bcc,
        subject: local.subject,
        text: input.body,
        html: input.body,
      }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(
        json.error ||
          (res.status === 503
            ? "Email sending is not configured. Set SendGrid on this server, then retry."
            : "Could not send the signing email."),
      );
    }
    if (files.length) {
      await deliverQueuedCrmEmail(local, { html: input.body, files }).catch(
        () => undefined,
      );
    }
  }
  return local;
}

export async function sendCrmActivityEmail(input: {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  relatedType?: string;
  relatedId?: string;
  relatedTo?: string;
  scheduledAt?: string;
  files?: File[];
}): Promise<Email> {
  const to = uniqueEmails(input.to);
  if (!to[0]) {
    throw new Error("Add a recipient email address");
  }
  const subject = input.subject.trim();
  if (!subject) {
    throw new Error("Subject is required");
  }
  const body = input.body.trim() || subject;
  const cc = uniqueEmails([...(input.cc ?? []), ...to.slice(1)]);
  const bcc = uniqueEmails(input.bcc ?? []);

  const { ensureCrmAccess, persistCrmTokens } = await import(
    "@/lib/activity-timeline/auth"
  );
  let access = await ensureCrmAccess();
  if (!access?.accessToken && typeof window !== "undefined") {
    const { refreshCrmTokenFromBrowser } = await import(
      "@/lib/auth/browser-session-cache"
    );
    const rotated = await refreshCrmTokenFromBrowser();
    if (typeof rotated.accessToken === "string" && rotated.accessToken) {
      persistCrmTokens({
        accessToken: rotated.accessToken,
        refreshToken:
          typeof rotated.refreshToken === "string" ? rotated.refreshToken : null,
      });
      access = await ensureCrmAccess();
    }
  }
  if (!access?.accessToken) {
    return deliverThroughFinConnexMail({
      to: [to[0]],
      cc,
      bcc,
      subject,
      body,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      relatedTo: input.relatedTo,
      files: input.files,
    });
  }

  const prepared = await prepareEmailPayload({
    html: body,
    files: input.files ?? [],
  });
  try {
    const created = await createCrmEmail({
      subject,
      body,
      to: [to[0]],
      cc,
      bcc,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      relatedTo: input.relatedTo,
      status: "Draft",
    });
    if (!created?.id) {
      throw new Error("CRM did not create the email draft");
    }
    persistRemoteEmail(created);
    try {
      const sent = await sendCrmEmail(created.id, {
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        html: prepared.html,
        files: prepared.files,
      });
      if (!sent || sent.status === "Draft" || sent.status === "Failed") {
        persistRemoteEmail({ ...created, ...(sent ?? {}), status: "Draft" });
        throw new Error("CRM send failed. The message was saved as a draft.");
      }
      const next = persistRemoteEmail(sent);
      if (!next) {
        throw new Error("CRM send failed. The message was saved as a draft.");
      }
      return next;
    } catch (err) {
      persistRemoteEmail({ ...created, status: "Draft" });
      throw err instanceof Error
        ? err
        : new Error("CRM send failed. The message was saved as a draft.");
    }
  } catch (err) {
    if (isCrmAuthFailure(err)) {
      return deliverThroughFinConnexMail({
        to: [to[0]],
        cc,
        bcc,
        subject,
        body,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        relatedTo: input.relatedTo,
        files: input.files,
      });
    }
    throw err;
  }
}
