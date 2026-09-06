import type { LeadCardData } from "@/lib/leads/types";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import {
  findContactByEmail,
  findContactById,
  findContactByName,
} from "@/lib/contacts/store";
import type { DealRecord } from "@/lib/deals/types";

export function resolveLeadContact(card: LeadCardData): {
  name: string;
  id?: string;
} {
  const customId = card.custom?.contactId?.trim();
  if (customId) {
    const found = findContactById(customId);
    if (found) return { name: found.contact.name, id: found.contact.id };
  }
  const applicant = leadApplicants(card)[0]?.name?.trim() || "";
  if (card.convertedContactId) {
    const found = findContactById(card.convertedContactId);
    if (found) return { name: found.contact.name, id: found.contact.id };
  }
  const byEmail = card.email ? findContactByEmail(card.email) : null;
  if (byEmail) return { name: byEmail.name, id: byEmail.id };
  const byApplicant = applicant ? findContactByName(applicant) : null;
  if (byApplicant) return { name: byApplicant.name, id: byApplicant.id };
  const byLeadName = findContactByName(card.name);
  if (byLeadName) return { name: byLeadName.name, id: byLeadName.id };
  const customName = card.custom?.contactName?.trim();
  if (customName) return { name: customName };
  return { name: applicant };
}

export function resolveDealContact(deal: DealRecord): {
  name: string;
  id?: string;
  email: string;
} {
  if (deal.contactId) {
    const found = findContactById(deal.contactId);
    if (found) {
      return {
        name: found.contact.name,
        id: found.contact.id,
        email: found.contact.email,
      };
    }
  }
  if (deal.contact?.trim()) {
    const byName = findContactByName(deal.contact);
    if (byName) {
      return { name: byName.name, id: byName.id, email: byName.email };
    }
    return { name: deal.contact.trim(), email: "" };
  }
  return { name: "", email: "" };
}
