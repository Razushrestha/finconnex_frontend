/** Live emails store (session-backed). */

import {
  emails as SEED_EMAILS,
  type Email,
  type EmailColumn,
  type EmailStatus,
} from "@/lib/emails/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function cloneSeed(): Email[] {
  return SEED_EMAILS.map((e) => ({
    ...e,
    to: [...e.to],
    cc: e.cc ? [...e.cc] : undefined,
    bcc: e.bcc ? [...e.bcc] : undefined,
  }));
}

const store = createBoardStore({
  key: "activities:emails:list:v1",
  seed: cloneSeed,
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
  relatedTo?: string;
  status: EmailStatus;
  sentDate?: string;
  templateUsed?: string;
}): Email {
  const email: Email = {
    id: newRulesId("email"),
    subject: input.subject.trim(),
    body: input.body,
    from: input.from,
    to: input.to,
    relatedTo: input.relatedTo,
    status: input.status,
    sentDate: input.sentDate ?? formatRulesAt(new Date()),
    templateUsed: input.templateUsed,
  };
  saveEmails([email, ...listEmails()]);
  emitLeadActivityChange();
  return email;
}

export function findEmailById(id: string) {
  const email = listEmails().find((e) => e.id === id);
  return email ? { email } : null;
}
