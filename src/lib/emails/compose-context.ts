import { isUuid } from "@/lib/activity-timeline/auth";
import { listRelatedCrmCalls, listCrmCalls, tryCrm as tryCrmCall } from "@/lib/calls/api";
import {
  listCrmContactDeals,
  loadCrmContacts,
  tryCrmContact,
} from "@/lib/contacts/api";
import { listCrmDeals, normalizeCrmDeals } from "@/lib/deals/api";
import { listCrmEmails, listRelatedCrmEmails, tryCrmEmail } from "@/lib/emails/api";
import { listEmails } from "@/lib/emails/store";
import type { RelatedRecord } from "@/lib/emails/related-records";
import { fetchLeadList } from "@/lib/leads/api";
import {
  listCrmMessages,
  listRelatedCrmMessages,
  tryCrmMessage,
} from "@/lib/messages/api";

export interface ComposeContactProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  tags: string[];
  engagement?: number;
  lastContact: string;
  href: string;
}

export type RecentCommKind = "email" | "sms" | "call" | "document";

export interface RecentCommItem {
  id: string;
  group: string;
  time?: string;
  kind: RecentCommKind;
  title: string;
}

export interface ComposeContextSnapshot {
  profile: ComposeContactProfile | null;
  related: RelatedRecord[];
  comms: RecentCommItem[];
}

export interface EmailTimelineEvent {
  id: string;
  emailId: string;
  title: string;
  detail: string;
  timestamp: string;
  href: string;
}

export interface ComposeCrmFacts {
  contactName: string;
  contactEmail: string;
  tags: string[];
  dealTitle?: string;
  dealStage?: string;
  documentsReceived: string[];
  documentsOutstanding: string[];
  lastActivity?: string;
}

function norm(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function relativeGroup(raw?: string) {
  if (!raw) return "Earlier";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (start.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === 2) return "2 days ago";
  if (diff < 7) return `${diff} days ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function timeOf(raw?: string) {
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function leadTitle(lead: {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string | null;
}) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  return name || lead.companyName || lead.email || "Lead";
}

function leadLocation(lead: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}) {
  return [lead.city, lead.state, lead.country].filter(Boolean).join(", ");
}

export async function loadComposeContext(
  name?: string,
  email?: string,
): Promise<ComposeContextSnapshot> {
  const emailQ = email?.trim() ?? "";
  const nameQ = (name && !name.includes("@") ? name.trim() : "") || "";
  if (!emailQ && !nameQ) {
    return { profile: null, related: [], comms: [] };
  }

  const search = emailQ || nameQ;
  const contacts = (await tryCrmContact(() =>
    loadCrmContacts({ search, limit: 50 }),
  )) ?? [];
  const contact =
    contacts.find(
      (row) => emailQ && norm(row.contact.email) === norm(emailQ),
    ) ??
    contacts.find((row) => nameQ && norm(row.contact.name) === norm(nameQ)) ??
    null;
  const contactId = contact?.contact.id ?? "";
  const liveContact = Boolean(contactId && isUuid(contactId));

  const [contactDeals, deals, leads, emails, calls, messages, relatedEmails, relatedCalls, relatedMessages] =
    await Promise.all([
      liveContact
        ? tryCrmContact(() => listCrmContactDeals(contactId)).then((data) =>
            data ? normalizeCrmDeals(data) : [],
          )
        : Promise.resolve([]),
      listCrmDeals({ search, limit: 50 }).catch(() => []),
      fetchLeadList({ search, limit: 50 }).catch(() => []),
      tryCrmEmail(() => listCrmEmails({ search, limit: 50 })).then((rows) => rows ?? []),
      tryCrmCall(() => listCrmCalls({ search, limit: 50 })).then((rows) => rows ?? []),
      tryCrmMessage(() => listCrmMessages({ search, limit: 50 })).then(
        (rows) => rows ?? [],
      ),
      liveContact
        ? tryCrmEmail(() => listRelatedCrmEmails("CONTACT", contactId)).then(
            (rows) => rows ?? [],
          )
        : Promise.resolve([]),
      liveContact
        ? tryCrmCall(() => listRelatedCrmCalls("CONTACT", contactId)).then(
            (rows) => rows ?? [],
          )
        : Promise.resolve([]),
      liveContact
        ? tryCrmMessage(() =>
            listRelatedCrmMessages("CONTACT", contactId),
          ).then((rows) => rows ?? [])
        : Promise.resolve([]),
    ]);

  const contactName = contact?.contact.name || nameQ;
  const fromContact = contactDeals.filter((deal) => isUuid(deal.id));
  const fromSearch = deals.filter((deal) => {
    if (!isUuid(deal.id)) return false;
    if (fromContact.some((row) => row.id === deal.id)) return false;
    if (liveContact && deal.contactId === contactId) return true;
    if (contactName && norm(deal.contact) === norm(contactName)) return true;
    return false;
  });
  const relatedDeals: RelatedRecord[] = [...fromContact, ...fromSearch].map(
    (deal) => ({
      id: deal.id,
      kind: "deal" as const,
      title: deal.name,
      stage: deal.stageTitle,
      href: `/sales/deals/detail/${deal.id}`,
      progress: 1,
      total: 1,
    }),
  );

  const relatedLeads: RelatedRecord[] = leads
    .filter((lead) => {
      if (!isUuid(lead.id)) return false;
      if (emailQ && norm(lead.email) === norm(emailQ)) return true;
      if (liveContact && lead.convertedContactId === contactId) return true;
      if (nameQ && norm(leadTitle(lead)) === norm(nameQ)) return true;
      return false;
    })
    .map((lead) => ({
      id: lead.id,
      kind: "lead" as const,
      title: leadTitle(lead),
      stage: lead.pipelineStageLabel || lead.status || "Lead",
      href: `/sales/leads/detail/${lead.id}`,
      progress: 1,
      total: 1,
    }));

  const matchingLead =
    leads.find((lead) => emailQ && norm(lead.email) === norm(emailQ)) ??
    leads.find((lead) => nameQ && norm(leadTitle(lead)) === norm(nameQ));

  const comms: RecentCommItem[] = [];
  const seen = new Set<string>();
  const push = (item: RecentCommItem) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    comms.push(item);
  };

  for (const mail of [...relatedEmails, ...emails]) {
    const hit =
      (emailQ && mail.to.some((addr) => norm(addr) === norm(emailQ))) ||
      relatedEmails.includes(mail);
    if (!hit) continue;
    push({
      id: `email-${mail.id}`,
      group: relativeGroup(mail.openedDate || mail.sentDate),
      time: timeOf(mail.openedDate || mail.sentDate),
      kind: "email",
      title: mail.status === "Opened" ? "Email opened" : mail.subject,
    });
  }

  for (const call of [...relatedCalls, ...calls]) {
    const hit =
      relatedCalls.includes(call) ||
      (contactName &&
        (norm(call.contact).includes(norm(contactName)) ||
          norm(call.relatedTo).includes(norm(contactName)))) ||
      (emailQ && norm(call.relatedTo).includes(norm(emailQ)));
    if (!hit) continue;
    push({
      id: `call-${call.id}`,
      group: relativeGroup(call.date),
      time: timeOf(call.date),
      kind: "call",
      title: call.duration ? `Call — ${call.duration}` : call.subject || "Call",
    });
  }

  for (const message of [...relatedMessages, ...messages]) {
    const hit =
      relatedMessages.includes(message) ||
      (emailQ && norm(message.to) === norm(emailQ)) ||
      (contactName && norm(message.relatedTo).includes(norm(contactName)));
    if (!hit) continue;
    push({
      id: `sms-${message.id}`,
      group: relativeGroup(message.sentDate),
      time: timeOf(message.sentDate),
      kind: "sms",
      title: message.subject || "SMS",
    });
  }

  const tags = [
    ...(contact?.contact.tags ?? []),
    contact?.contact.lifecycleStage,
  ].filter((tag): tag is string => Boolean(tag?.trim()));

  const location =
    (matchingLead ? leadLocation(matchingLead) : "") ||
    contact?.contact.company ||
    "";

  const displayEmail = contact?.contact.email || emailQ;
  const displayName = contact?.contact.name || nameQ || displayEmail;

  return {
    profile: {
      name: displayName,
      email: displayEmail,
      phone: contact?.contact.mobile || contact?.contact.phone || "",
      location,
      tags,
      engagement:
        typeof matchingLead?.score === "number" ? matchingLead.score : undefined,
      lastContact: comms[0]?.group ?? "",
      href: liveContact
        ? `/sales/contacts/detail/${contactId}`
        : "/sales/contacts",
    },
    related: [...relatedDeals, ...relatedLeads],
    comms: comms.slice(0, 8),
  };
}

function parseSortableDate(raw?: string) {
  if (!raw?.trim()) return 0;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  // en-AU style: 31/08/2026 08:16 AM
  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i,
  );
  if (!match) return 0;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  let hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const ap = (match[6] ?? "").toUpperCase();
  if (ap === "PM" && hour < 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  return new Date(year, month, day, hour, minute).getTime();
}

/** Email-only timeline for the compose contact (newest first). */
export function emailTimelineForPerson(
  name?: string,
  email?: string,
): EmailTimelineEvent[] {
  const n = name?.trim().toLowerCase() ?? "";
  const e = email?.trim().toLowerCase() ?? "";
  const events: EmailTimelineEvent[] = [];

  for (const mail of listEmails()) {
    if (mail.status === "Draft") continue;
    const addresses = [mail.from, ...mail.to, ...(mail.cc ?? [])].map((a) =>
      a.toLowerCase(),
    );
    const hit =
      (e && addresses.some((addr) => addr === e)) ||
      (n &&
        (mail.relatedTo?.toLowerCase().includes(n) ||
          mail.subject.toLowerCase().includes(n) ||
          mail.from.toLowerCase().includes(n)));
    if (!hit) continue;

    if (mail.sentDate) {
      events.push({
        id: `${mail.id}-sent`,
        emailId: mail.id,
        title: mail.subject || "(no subject)",
        detail: `Email ${mail.status === "Scheduled" ? "scheduled" : "sent"}`,
        timestamp: mail.sentDate,
        href: `/activities/emails/detail/${mail.id}`,
      });
    }
    if (mail.openedDate) {
      events.push({
        id: `${mail.id}-opened`,
        emailId: mail.id,
        title: mail.subject || "(no subject)",
        detail: "Email opened",
        timestamp: mail.openedDate,
        href: `/activities/emails/detail/${mail.id}`,
      });
    }
    if (!mail.sentDate && !mail.openedDate) {
      events.push({
        id: `${mail.id}-status`,
        emailId: mail.id,
        title: mail.subject || "(no subject)",
        detail: mail.status,
        timestamp: "",
        href: `/activities/emails/detail/${mail.id}`,
      });
    }
  }

  return events
    .sort((a, b) => parseSortableDate(b.timestamp) - parseSortableDate(a.timestamp))
    .slice(0, 12);
}
