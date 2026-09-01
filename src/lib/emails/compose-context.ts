import { findContactByEmail, findContactByName } from "@/lib/contacts/store";
import { listCalls } from "@/lib/calls/store";
import { listEmails } from "@/lib/emails/store";
import { listMessages } from "@/lib/messages/store";
import { relatedRecordsForPerson, type RelatedRecord } from "@/lib/emails/related-records";

export interface ComposeContactProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  tags: string[];
  engagement: number;
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

const DEMO_OUTSTANDING = ["Latest 2 payslips", "ID — back of licence"];
const DEMO_RECEIVED = ["Driver licence (front)", "Medicare card"];

function hashScore(value: string) {
  let n = 0;
  for (const ch of value) n = (n + ch.charCodeAt(0) * 13) % 40;
  return 70 + n;
}

function relativeGroup(raw?: string) {
  if (!raw) return "Earlier";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    const lower = raw.toLowerCase();
    if (lower.includes("today")) return "Today";
    if (lower.includes("yesterday")) return "Yesterday";
    return raw;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((start.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === 2) return "2 days ago";
  if (diff < 7) return `${diff} days ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function timeOf(raw?: string) {
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    const match = raw.match(/\d{1,2}:\d{2}\s?(AM|PM)?/i);
    return match?.[0];
  }
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

export function composeContactProfile(
  name?: string,
  email?: string,
): ComposeContactProfile {
  const contact =
    (email ? findContactByEmail(email) : null) ??
    (name && !name.includes("@") ? findContactByName(name) : null);
  const displayName = contact?.name || (name && !name.includes("@") ? name : "") || "Sarah Johnson";
  const displayEmail = contact?.email || email || "sarah.johnson@email.com";
  const related = relatedRecordsForPerson(displayName, displayEmail);
  const deal = related.find((item) => item.kind === "deal");
  const tags = [
    contact ? "Client" : "Client",
    deal?.title.toLowerCase().includes("home") ? "First Home Buyer" : null,
    deal ? "Warm Lead" : "New enquiry",
  ].filter(Boolean) as string[];

  return {
    name: displayName,
    email: displayEmail,
    phone: contact?.mobile || contact?.phone || "0412 345 678",
    location: "Sydney, NSW",
    tags,
    engagement: hashScore(displayEmail || displayName),
    lastContact: "2 days ago",
    href: contact ? `/sales/contacts/detail/${contact.id}` : "/sales/contacts",
  };
}

export function composeCrmFacts(
  name?: string,
  email?: string,
  related: RelatedRecord[] = relatedRecordsForPerson(name, email),
): ComposeCrmFacts {
  const profile = composeContactProfile(name, email);
  const deal = related.find((item) => item.kind === "deal");
  return {
    contactName: profile.name,
    contactEmail: profile.email,
    tags: profile.tags,
    dealTitle: deal?.title,
    dealStage: deal?.stage,
    documentsReceived: DEMO_RECEIVED,
    documentsOutstanding: deal?.stage.toLowerCase().includes("document")
      ? DEMO_OUTSTANDING
      : [],
    lastActivity: profile.lastContact,
  };
}

function demoComms(): RecentCommItem[] {
  return [
    { id: "d1", group: "Today", time: "10:24 AM", kind: "email", title: "Email opened" },
    { id: "d2", group: "Yesterday", kind: "sms", title: "Documents requested" },
    { id: "d3", group: "2 days ago", kind: "call", title: "Call — 8 min" },
    { id: "d4", group: "3 days ago", kind: "email", title: "Application update" },
  ];
}

export function recentCommunicationForPerson(
  name?: string,
  email?: string,
): RecentCommItem[] {
  const n = name?.trim().toLowerCase() ?? "";
  const e = email?.trim().toLowerCase() ?? "";
  const items: RecentCommItem[] = [];

  for (const mail of listEmails()) {
    const hit =
      (e && mail.to.some((addr) => addr.toLowerCase() === e)) ||
      (n && mail.relatedTo?.toLowerCase().includes(n));
    if (!hit) continue;
    items.push({
      id: `email-${mail.id}`,
      group: relativeGroup(mail.openedDate || mail.sentDate),
      time: timeOf(mail.openedDate || mail.sentDate),
      kind: "email",
      title: mail.status === "Opened" ? "Email opened" : mail.subject,
    });
  }

  for (const call of listCalls()) {
    const hit =
      (n && (call.contact?.toLowerCase().includes(n) || call.relatedTo?.toLowerCase().includes(n))) ||
      (e && call.relatedTo?.toLowerCase().includes(e));
    if (!hit) continue;
    items.push({
      id: `call-${call.id}`,
      group: relativeGroup(call.date),
      time: timeOf(call.date),
      kind: "call",
      title: call.duration ? `Call — ${call.duration}` : call.subject || "Call",
    });
  }

  for (const message of listMessages()) {
    const hit =
      (e && message.to.toLowerCase() === e) ||
      (n && message.relatedTo?.toLowerCase().includes(n));
    if (!hit) continue;
    items.push({
      id: `sms-${message.id}`,
      group: relativeGroup(message.sentDate),
      time: timeOf(message.sentDate),
      kind: "sms",
      title: message.subject || "SMS",
    });
  }

  if (items.length) return items.slice(0, 6);
  if (e && n) return demoComms();
  return demoComms();
}
