import { listAllDeals } from "@/lib/deals/store";
import { listLeadColumns } from "@/lib/leads/store";
import {
  findCompanyByName,
  listCompanyGroups,
} from "@/lib/companies/store";
import { listAllContacts } from "@/lib/contacts/store";
import { listInboxConversations } from "@/lib/marketing/inbox/types";
import { parseRelatedRef } from "@/lib/related-entity";
import { uniqueTags } from "./tones";

function leadCards() {
  return listLeadColumns().flatMap((col) => col.cards);
}

function findLeadByName(name: string) {
  const key = name.trim().toLowerCase();
  return leadCards().find((card) => card.name.trim().toLowerCase() === key) ?? null;
}

function findDealByName(name: string) {
  const key = name.trim().toLowerCase();
  return listAllDeals().find((deal) => deal.name.trim().toLowerCase() === key) ?? null;
}

export function listWorkspaceTags() {
  const bag: string[] = [];
  for (const conversation of listInboxConversations()) bag.push(...conversation.tags);
  for (const card of leadCards()) bag.push(...(card.tags ?? []));
  for (const contact of listAllContacts()) bag.push(...(contact.tags ?? []));
  for (const group of listCompanyGroups()) {
    for (const company of group.companies) bag.push(...(company.tags ?? []));
  }
  for (const deal of listAllDeals()) bag.push(...(deal.tags ?? []));
  return uniqueTags(bag);
}

export function relatedRecordTags(relatedTo?: string) {
  const related = parseRelatedRef(relatedTo);
  if (!related?.name) return [];
  if (related.kind === "Lead") {
    return uniqueTags(findLeadByName(related.name)?.tags ?? []);
  }
  if (related.kind === "Contact") {
    const key = related.name.trim().toLowerCase();
    const contact = listAllContacts().find(
      (item) => item.name.trim().toLowerCase() === key,
    );
    return uniqueTags(contact?.tags ?? []);
  }
  if (related.kind === "Company") {
    const company = findCompanyByName(related.name)?.company;
    const fromLeads = leadCards()
      .filter(
        (card) =>
          card.company.trim().toLowerCase() === related.name.trim().toLowerCase(),
      )
      .flatMap((card) => card.tags ?? []);
    return uniqueTags([...(company?.tags ?? []), ...fromLeads]);
  }
  if (related.kind === "Deal") {
    const deal = findDealByName(related.name);
    const account = deal?.account?.trim() ?? "";
    const fromLeads = account
      ? leadCards()
          .filter(
            (card) => card.company.trim().toLowerCase() === account.toLowerCase(),
          )
          .flatMap((card) => card.tags ?? [])
      : [];
    const fromCompany = account
      ? findCompanyByName(account)?.company.tags ?? []
      : [];
    return uniqueTags([...(deal?.tags ?? []), ...fromCompany, ...fromLeads]);
  }
  return [];
}

export function relatedTagsSectionLabel(relatedTo?: string) {
  const related = parseRelatedRef(relatedTo);
  if (related?.kind === "Company") return "From company";
  if (related?.kind === "Lead") return "On this lead";
  if (related?.kind === "Deal") return "On this deal";
  if (related?.kind === "Contact") return "On this contact";
  return "On this record";
}
