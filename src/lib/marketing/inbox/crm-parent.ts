import { isUuid } from "@/lib/activity-timeline/auth";
import { findCompanyByName } from "@/lib/companies/store";
import { findContactByEmail, findContactByName } from "@/lib/contacts/store";
import { listAllDeals } from "@/lib/deals/store";
import { findLeadByEmail, listLeadColumns } from "@/lib/leads/store";
import type { InboxConversation, InboxMessage } from "@/lib/marketing/inbox/types";
import type { Message } from "@/lib/messages/types";

export type InboxCrmParent = {
  type: "LEAD" | "CONTACT" | "DEAL" | "COMPANY";
  id: string;
  relatedTo: string;
};

function sameName(a?: string, b?: string) {
  const left = a?.trim().toLowerCase() ?? "";
  const right = b?.trim().toLowerCase() ?? "";
  return Boolean(left && right && left === right);
}

function relatedParts(relatedTo?: string) {
  if (!relatedTo) return null;
  const idx = relatedTo.indexOf(": ");
  if (idx < 0) return { kind: "Related", name: relatedTo };
  return { kind: relatedTo.slice(0, idx), name: relatedTo.slice(idx + 2) };
}

function findLeadByName(name: string) {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  for (const col of listLeadColumns()) {
    const card = col.cards.find((item) => item.name.trim().toLowerCase() === needle);
    if (card) return card;
  }
  return null;
}

export function resolveInboxCrmParent(
  conversation: InboxConversation,
): InboxCrmParent | null {
  if (conversation.contactId && isUuid(conversation.contactId)) {
    return {
      type: "CONTACT",
      id: conversation.contactId,
      relatedTo: `Contact: ${conversation.contactName}`,
    };
  }

  const related = relatedParts(conversation.relatedTo);
  const kind = related?.kind.trim().toLowerCase() ?? "";
  const relatedName = related?.name ?? "";

  if (kind === "lead" || !kind) {
    const lead =
      (conversation.contactEmail
        ? findLeadByEmail(conversation.contactEmail)?.card
        : null) ??
      findLeadByName(relatedName || conversation.contactName);
    if (lead && isUuid(lead.id)) {
      return { type: "LEAD", id: lead.id, relatedTo: `Lead: ${lead.name}` };
    }
  }

  if (kind === "contact" || !kind) {
    const contact =
      (conversation.contactEmail
        ? findContactByEmail(conversation.contactEmail)
        : null) ?? findContactByName(relatedName || conversation.contactName);
    if (contact && isUuid(contact.id)) {
      return {
        type: "CONTACT",
        id: contact.id,
        relatedTo: `Contact: ${contact.name}`,
      };
    }
  }

  if (kind === "deal") {
    const deal = listAllDeals().find((row) => sameName(row.name, relatedName));
    if (deal && isUuid(deal.id)) {
      return { type: "DEAL", id: deal.id, relatedTo: `Deal: ${deal.name}` };
    }
  }

  if (kind === "company") {
    const hit = findCompanyByName(relatedName);
    if (hit?.company.id && isUuid(hit.company.id)) {
      return {
        type: "COMPANY",
        id: hit.company.id,
        relatedTo: `Company: ${hit.company.name}`,
      };
    }
  }

  return null;
}

export function crmMessageToInbox(
  row: Message,
  conversation: InboxConversation,
): InboxMessage {
  const contact = conversation.contactName.trim().toLowerCase();
  const from = row.from.trim().toLowerCase();
  return {
    id: row.id,
    body: row.body || row.subject,
    at: row.sentDate || "",
    outbound: Boolean(contact) && from !== contact,
    author: row.from || (from === contact ? conversation.contactName : "You"),
  };
}

export function isDemoInboxMessageId(id: string) {
  return /^m\d+$/i.test(id.trim());
}
