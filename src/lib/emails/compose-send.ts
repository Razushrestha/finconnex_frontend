import { persistRemoteEmail, createCrmEmail, sendCrmEmail } from "@/lib/emails/api";
import type { Email } from "@/lib/emails/types";

function uniqueEmails(list: Array<string | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const email = raw?.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    out.push(raw!.trim());
  }
  return out;
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
  const created = await createCrmEmail({
    subject,
    body,
    to: [to[0]],
    cc: uniqueEmails([...(input.cc ?? []), ...to.slice(1)]),
    bcc: uniqueEmails(input.bcc ?? []),
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
    const sent = await sendCrmEmail(
      created.id,
      input.scheduledAt ? { scheduledAt: input.scheduledAt } : {},
    );
    if (!sent || sent.status === "Draft" || sent.status === "Failed") {
      persistRemoteEmail({ ...created, ...(sent ?? {}), status: "Draft" });
      throw new Error("CRM send failed. The message was saved as a draft.");
    }
    const next = persistRemoteEmail(sent);
    if (!next) throw new Error("CRM send failed. The message was saved as a draft.");
    return next;
  } catch (err) {
    persistRemoteEmail({ ...created, status: "Draft" });
    throw err instanceof Error
      ? err
      : new Error("CRM send failed. The message was saved as a draft.");
  }
}
