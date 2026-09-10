import { isUuid } from "@/lib/activity-timeline/auth";
import {
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
  type RelatedTo,
} from "@/lib/activities/shared";
import { listCrmCompanies, tryCrmCompany } from "@/lib/companies/api";
import { listCompanyGroups, mergeCrmCompaniesIntoBoard } from "@/lib/companies/store";
import { listCrmContacts, tryCrmContact } from "@/lib/contacts/api";
import { findContactByName, listAllContacts, mergeCrmContactsIntoBoard } from "@/lib/contacts/store";
import { listCrmDeals, tryCrmDeal } from "@/lib/deals/api";
import { listAllDeals, mergeCrmDealsIntoBoard } from "@/lib/deals/store";
import { fetchLeadList } from "@/lib/leads/api";
import { mapCrmLeadToCard } from "@/lib/leads/api/map";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import { listLeadColumns, upsertLeadFromCard } from "@/lib/leads/store";
import { namesEqual } from "@/lib/related-entity";

export const TASK_RELATED_ENTITY_KINDS = ["Lead", "Deal", "Company"] as const;
export type TaskRelatedEntityKind = (typeof TASK_RELATED_ENTITY_KINDS)[number];

/** True when a record title belongs to the chosen contact (e.g. Mohit → Mohit - Home loans). */
export function nameLinkedToContact(recordName: string, contactName: string) {
  const record = recordName.trim().toLowerCase();
  const contact = contactName.trim().toLowerCase();
  if (!record || !contact) return false;
  if (record.includes(contact) || contact.includes(record)) return true;
  const first = contact.split(/\s+/).filter(Boolean)[0] ?? "";
  return first.length >= 3 && record.includes(first);
}

function keyOf(item: RelatedTo) {
  return `${item.kind}:${(item.id || item.name).trim().toLowerCase()}`;
}

function dedupe(rows: RelatedTo[]): RelatedTo[] {
  const seen = new Set<string>();
  const unique: RelatedTo[] = [];
  for (const item of rows) {
    const name = item.name.trim();
    if (!name) continue;
    const key = keyOf({ kind: item.kind, name, id: item.id });
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ kind: item.kind, name, id: item.id });
  }
  return unique;
}

/** Local board records for Related Entity / Related Record pickers. */
export function liveRelatedRecords(
  kind?: RelatedEntityKind | "",
  extra?: RelatedTo,
  opts?: { includeSamples?: boolean },
): RelatedTo[] {
  const rows: RelatedTo[] = [];
  const want = (next: RelatedEntityKind) => !kind || kind === next;

  if (want("Lead")) {
    for (const column of listLeadColumns()) {
      for (const card of column.cards) {
        rows.push({ kind: "Lead", name: card.name, id: card.id });
      }
    }
  }
  if (want("Contact")) {
    for (const contact of listAllContacts()) {
      rows.push({ kind: "Contact", name: contact.name, id: contact.id });
    }
  }
  if (want("Deal")) {
    for (const deal of listAllDeals()) {
      rows.push({ kind: "Deal", name: deal.name, id: deal.id });
    }
  }
  if (want("Company")) {
    for (const group of listCompanyGroups()) {
      for (const company of group.companies) {
        rows.push({ kind: "Company", name: company.name, id: company.id });
      }
    }
  }

  if (opts?.includeSamples) {
    for (const item of RELATED_RECORD_OPTIONS) {
      if (want(item.kind)) rows.push(item);
    }
  }
  if (extra && extra.name.trim() && want(extra.kind)) {
    rows.unshift(extra);
  }

  return dedupe(rows);
}

/** Load Lead / Contact / Company / Deal rows from CRM for related-record pickers. */
export async function fetchCrmRelatedRecords(
  kind: RelatedEntityKind,
): Promise<RelatedTo[]> {
  if (kind === "Company") {
    const remote = await tryCrmCompany(() => listCrmCompanies({ limit: 100 }));
    if (!remote?.length) return [];
    mergeCrmCompaniesIntoBoard(remote);
    return remote
      .filter((item) => isUuid(item.company.id) && item.company.name.trim())
      .map((item) => ({
        kind: "Company" as const,
        name: item.company.name,
        id: item.company.id,
      }));
  }

  if (kind === "Contact") {
    const remote = await tryCrmContact(() => listCrmContacts({ limit: 100 }));
    if (!remote?.length) return [];
    mergeCrmContactsIntoBoard(remote);
    return remote
      .filter((item) => isUuid(item.contact.id) && item.contact.name.trim())
      .map((item) => ({
        kind: "Contact" as const,
        name: item.contact.name,
        id: item.contact.id,
      }));
  }

  if (kind === "Deal") {
    const remote = await tryCrmDeal(() => listCrmDeals({ limit: 100 }));
    if (!remote?.length) return [];
    mergeCrmDealsIntoBoard(remote);
    return remote
      .filter((item) => isUuid(item.id) && item.name.trim())
      .map((item) => ({
        kind: "Deal" as const,
        name: item.name,
        id: item.id,
      }));
  }

  try {
    const remote = await fetchLeadList({ limit: 100 });
    const rows: RelatedTo[] = [];
    for (const lead of remote) {
      const card = mapCrmLeadToCard(lead);
      if (!isUuid(card.id) || !card.name.trim()) continue;
      upsertLeadFromCard(card);
      rows.push({ kind: "Lead", name: card.name, id: card.id });
    }
    return rows;
  } catch {
    return [];
  }
}

export function mergeRelatedRecordOptions(
  remote: RelatedTo[],
  kind?: RelatedEntityKind | "",
  extra?: RelatedTo,
): RelatedTo[] {
  const local = liveRelatedRecords(kind, extra).filter(
    (row) => !row.id || isUuid(row.id),
  );
  const preferred = remote.length ? remote : local;
  return dedupe([
    ...(extra && extra.name.trim() ? [extra] : []),
    ...preferred,
  ]);
}

export function recordMatchesContact(
  record: RelatedTo,
  contactName: string,
): boolean {
  const query = contactName.trim();
  if (!query) return false;
  if (nameLinkedToContact(record.name, query)) return true;

  const contact = findContactByName(query);
  if (!contact) return false;

  if (record.kind === "Lead") {
    for (const column of listLeadColumns()) {
      const card = column.cards.find((item) =>
        namesEqual(item.name, record.name),
      );
      if (!card) continue;
      if (contact.id && card.convertedContactId === contact.id) return true;
      if (card.email && namesEqual(card.email, contact.email)) return true;
      if (leadApplicants(card).some((person) => nameLinkedToContact(person.name, contact.name))) {
        return true;
      }
    }
    return false;
  }

  if (record.kind === "Deal") {
    const deal = listAllDeals().find((item) => namesEqual(item.name, record.name));
    if (!deal) return false;
    if (contact.dealIds?.includes(deal.id)) return true;
    if (deal.contactId && deal.contactId === contact.id) return true;
    return Boolean(deal.contact && nameLinkedToContact(deal.contact, contact.name));
  }

  if (record.kind === "Company") {
    return Boolean(contact.company && namesEqual(contact.company, record.name));
  }

  return false;
}

/** Put records linked to the selected contact first; still include every record of that type. */
export function rankRelatedRecordsByContact(
  records: RelatedTo[],
  contactName?: string,
): RelatedTo[] {
  const query = contactName?.trim();
  if (!query) return records;
  const linked: RelatedTo[] = [];
  const rest: RelatedTo[] = [];
  for (const record of records) {
    (recordMatchesContact(record, query) ? linked : rest).push(record);
  }
  return [...linked, ...rest];
}
