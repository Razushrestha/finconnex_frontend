/** Session-backed lead conversation thread (WhatsApp, SMS, Email, Call). */

import { listCalls } from "@/lib/calls/store";
import { listEmails } from "@/lib/emails/store";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { relatedMatchesLead } from "@/lib/leads/activity-index";
import type { LeadCardData } from "@/lib/leads/types";
import { listMessages } from "@/lib/messages/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  emitLeadActivityChange,
  onLeadActivityChange,
} from "@/lib/leads/lead-extras-store";
import {
  formatRulesAt,
  newRulesId,
  readJsonStore,
  writeJsonStore,
} from "@/lib/rules/storage";

export type ConversationChannel = "whatsapp" | "sms" | "email" | "call";

export type ConversationKind = "text" | "voice" | "email" | "call";

export type ConversationAttachment = {
  name: string;
  size: string;
};

export type ConversationItem = {
  id: string;
  leadId: string;
  channel: ConversationChannel;
  kind: ConversationKind;
  direction: "in" | "out";
  fromName: string;
  body: string;
  subject?: string;
  fromEmail?: string;
  toEmail?: string;
  at: string;
  status: "sent" | "delivered" | "read";
  attachment?: ConversationAttachment;
  durationSeconds?: number;
  callOutcome?: "completed" | "missed";
};

const KEY = "sales:leads:conversation:v5";
const SEEDED = "sales:leads:conversation:seeded:v5";

function readAll(): ConversationItem[] {
  return readJsonStore<ConversationItem[]>(KEY, []);
}

function writeAll(rows: ConversationItem[]) {
  writeJsonStore(KEY, rows);
}

function seededIds(): string[] {
  return readJsonStore<string[]>(SEEDED, []);
}

function markSeeded(leadId: string) {
  const ids = new Set(seededIds());
  ids.add(leadId);
  writeJsonStore(SEEDED, [...ids]);
}

function seedThread(_card: LeadCardData): ConversationItem[] {
  return [];
}

function importLive(card: LeadCardData): ConversationItem[] {
  const ownerSet = new Set(ACTIVITY_OWNERS.map((o) => o.toLowerCase()));
  const out: ConversationItem[] = [];

  for (const msg of listMessages()) {
    const related =
      relatedMatchesLead(msg.relatedTo, card.name) ||
      msg.to.toLowerCase() === card.name.toLowerCase() ||
      msg.from.toLowerCase() === card.name.toLowerCase();
    if (!related || msg.status === "Draft" || msg.status === "Failed") continue;
    const outbound = ownerSet.has(msg.from.toLowerCase());
    const whatsapp = /whatsapp/i.test(`${msg.subject} ${msg.template ?? ""}`);
    out.push({
      id: msg.id,
      leadId: card.id,
      channel: whatsapp ? "whatsapp" : "sms",
      kind: "text",
      direction: outbound ? "out" : "in",
      fromName: outbound ? msg.from : card.name,
      body: msg.body || msg.subject,
      at: (parseFlexibleDate(msg.sentDate) ?? new Date()).toISOString(),
      status:
        msg.status === "Read"
          ? "read"
          : msg.status === "Delivered"
            ? "delivered"
            : "sent",
    });
  }

  for (const email of listEmails()) {
    const related =
      relatedMatchesLead(email.relatedTo, card.name) ||
      (email.relatedTo ?? "").toLowerCase() === card.name.toLowerCase() ||
      email.to.some((to) => to.toLowerCase() === card.email.toLowerCase());
    if (!related || email.status === "Draft" || email.status === "Failed") {
      continue;
    }
    const outbound =
      ownerSet.has(email.from.toLowerCase()) ||
      email.from.toLowerCase().includes("finconnex");
    out.push({
      id: email.id,
      leadId: card.id,
      channel: "email",
      kind: "email",
      direction: outbound ? "out" : "in",
      fromName: outbound ? card.owner : card.name,
      fromEmail: email.from,
      toEmail: email.to[0],
      subject: email.subject,
      body: email.body,
      at: (parseFlexibleDate(email.sentDate) ?? new Date()).toISOString(),
      status: email.status === "Opened" ? "read" : "sent",
    });
  }

  for (const call of listCalls()) {
    const related =
      relatedMatchesLead(call.relatedTo, card.name) ||
      (!!call.contact &&
        call.contact.trim().toLowerCase() === card.name.toLowerCase());
    if (!related || call.status === "Cancelled") continue;
    const inbound = call.callType === "Inbound" || call.callType === "Missed";
    out.push({
      id: call.id,
      leadId: card.id,
      channel: "call",
      kind: "call",
      direction: inbound ? "in" : "out",
      fromName: inbound ? card.name : call.calledBy || call.assignedTo || card.owner,
      body: call.subject || "Call",
      at: (parseFlexibleDate(call.date) ?? new Date()).toISOString(),
      status: "read",
      durationSeconds: call.recording?.durationSeconds,
      callOutcome: call.callType === "Missed" ? "missed" : "completed",
    });
  }

  return out.filter((item) => !Number.isNaN(new Date(item.at).getTime()));
}

export function listLeadConversation(card: LeadCardData): ConversationItem[] {
  const existing = readAll().filter((row) => row.leadId === card.id);
  if (!seededIds().includes(card.id)) {
    const seeded = [...seedThread(card), ...importLive(card)];
    writeAll([...readAll().filter((row) => row.leadId !== card.id), ...seeded]);
    markSeeded(card.id);
    return seeded.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }
  return existing.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

export function addLeadConversationItem(
  item: Omit<ConversationItem, "id" | "at" | "status"> & {
    id?: string;
    at?: string;
    status?: ConversationItem["status"];
    kind?: ConversationKind;
    fromName?: string;
  },
): ConversationItem {
  const row: ConversationItem = {
    ...item,
    kind: item.kind ?? (item.channel === "email" ? "email" : item.channel === "call" ? "call" : "text"),
    fromName: item.fromName ?? "Unknown",
    id: item.id ?? newRulesId("convo"),
    at: item.at ?? new Date().toISOString(),
    status: item.status ?? "read",
  };
  writeAll([row, ...readAll()]);
  emitLeadActivityChange();
  return row;
}

export function conversationStamp() {
  return formatRulesAt(new Date());
}

export function formatDuration(seconds?: number) {
  const n = Math.max(0, seconds ?? 0);
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export { onLeadActivityChange };
