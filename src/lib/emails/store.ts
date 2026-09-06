/** Live emails store (session-backed). */
/** @deprecated Phase 9 hydrate alias — live key is activities:emails:list:v2 */
export const EMAILS_HYDRATE_KEY_V1 = "activities:emails:list:v1";

import {
  type Email,
  type EmailColumn,
  type EmailStatus,
} from "@/lib/emails/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function cloneEmail(email: Email): Email {
  return {
    ...email,
    to: [...email.to],
    cc: email.cc ? [...email.cc] : undefined,
    bcc: email.bcc ? [...email.bcc] : undefined,
    attachments: email.attachments?.map((a) => ({ ...a })),
  };
}

const store = createBoardStore({
  key: "activities:emails:list:v3",
  seed: () => [] as Email[],
});

export function listEmails(): Email[] {
  return store.list();
}

export function saveEmails(items: Email[]) {
  store.save(items);
}

export function listEmailColumns(): EmailColumn[] {
  const emails = listEmails();
  return [
    {
      id: "draft",
      title: "Draft",
      count: emails.filter((e) => e.status === "Draft").length,
      badgeColorClass: "bg-slate-400 text-white",
      emails: emails.filter((e) => e.status === "Draft"),
    },
    {
      id: "scheduled",
      title: "Scheduled",
      count: emails.filter((e) => e.status === "Scheduled").length,
      badgeColorClass: "bg-sky-500 text-white",
      emails: emails.filter((e) => e.status === "Scheduled"),
    },
    {
      id: "sent",
      title: "Sent",
      count: emails.filter((e) => e.status === "Sent" || e.status === "Delivered" || e.status === "Opened").length,
      badgeColorClass: "bg-emerald-400 text-white",
      emails: emails.filter(
        (e) =>
          e.status === "Sent" ||
          e.status === "Delivered" ||
          e.status === "Opened",
      ),
    },
    {
      id: "failed",
      title: "Failed",
      count: emails.filter((e) => e.status === "Failed" || e.status === "Bounced").length,
      badgeColorClass: "bg-rose-400 text-white",
      emails: emails.filter((e) => e.status === "Failed" || e.status === "Bounced"),
    },
  ];
}

export function createEmail(input: {
  subject: string;
  body: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  relatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  status: EmailStatus;
  sentDate?: string;
  templateUsed?: string;
  importance?: Email["importance"];
  attachments?: Email["attachments"];
}): Email {
  const email: Email = {
    id: newRulesId("email"),
    subject: input.subject.trim(),
    body: input.body,
    from: input.from,
    to: input.to,
    cc: input.cc?.length ? [...input.cc] : undefined,
    bcc: input.bcc?.length ? [...input.bcc] : undefined,
    relatedTo: input.relatedTo,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    status: input.status,
    sentDate: input.sentDate ?? formatRulesAt(new Date()),
    templateUsed: input.templateUsed,
    importance: input.importance,
    attachments: input.attachments?.length
      ? input.attachments.map((a) => ({ ...a }))
      : undefined,
  };
  return upsertEmail(email);
}

export function upsertEmail(email: Email): Email {
  const next = cloneEmail(email);
  const items = listEmails().filter((row) => row.id !== next.id);
  saveEmails([next, ...items]);
  emitLeadActivityChange();
  return next;
}

export function findEmailById(id: string) {
  const email = listEmails().find((e) => e.id === id);
  return email ? { email } : null;
}

export function updateEmail(id: string, patch: Partial<Email>): Email | null {
  let updated: Email | null = null;
  saveEmails(
    listEmails().map((email) => {
      if (email.id !== id) return email;
      updated = { ...email, ...patch, id };
      return updated;
    }),
  );
  if (updated) emitLeadActivityChange();
  return updated;
}

export function deleteEmail(id: string): Email | null {
  const items = listEmails();
  const found = items.find((email) => email.id === id) ?? null;
  if (!found) return null;
  saveEmails(items.filter((email) => email.id !== id));
  emitLeadActivityChange();
  return found;
}

function isDemoSeedId(id: string) {
  return /^e\d+$/i.test(id);
}

export function mergeCrmEmails(remote: Email[]) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((e) => e.id));
  const local = listEmails().filter(
    (e) => !remoteIds.has(e.id) && !isDemoSeedId(e.id),
  );
  saveEmails([...remote.map(cloneEmail), ...local.map(cloneEmail)]);
}

export function replaceCrmEmails(remote: Email[]) {
  const remoteIds = new Set(remote.map((row) => row.id));
  const extras = listEmails().filter((row) => {
    if (isDemoSeedId(row.id)) return false;
    if (remoteIds.has(row.id)) return false;
    if (!remote.length) return true;
    const duplicate = remote.some(
      (item) =>
        item.subject.trim().toLowerCase() === row.subject.trim().toLowerCase() &&
        item.body.trim() === row.body.trim(),
    );
    return !duplicate;
  });
  saveEmails([...remote.map(cloneEmail), ...extras.map(cloneEmail)]);
}
