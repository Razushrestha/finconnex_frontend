import {
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
  type RelatedTo,
} from "@/lib/activities/shared";
import { listCompanyGroups } from "@/lib/companies/store";
import { listAllContacts } from "@/lib/contacts/store";
import { listAllDeals } from "@/lib/deals/store";
import { listLeadColumns } from "@/lib/leads/store";

function keyOf(item: RelatedTo) {
  return `${item.kind}:${item.name.trim().toLowerCase()}`;
}

/** Live CRM records plus seed samples, for Related Entity / Related Record pickers. */
export function liveRelatedRecords(
  kind?: RelatedEntityKind | "",
  extra?: RelatedTo,
): RelatedTo[] {
  const rows: RelatedTo[] = [];
  const want = (next: RelatedEntityKind) => !kind || kind === next;

  if (want("Lead")) {
    for (const column of listLeadColumns()) {
      for (const card of column.cards) {
        rows.push({ kind: "Lead", name: card.name });
      }
    }
  }
  if (want("Contact")) {
    for (const contact of listAllContacts()) {
      rows.push({ kind: "Contact", name: contact.name });
    }
  }
  if (want("Deal")) {
    for (const deal of listAllDeals()) {
      rows.push({ kind: "Deal", name: deal.name });
    }
  }
  if (want("Company")) {
    for (const group of listCompanyGroups()) {
      for (const company of group.companies) {
        rows.push({ kind: "Company", name: company.name });
      }
    }
  }

  for (const item of RELATED_RECORD_OPTIONS) {
    if (want(item.kind)) rows.push(item);
  }
  if (extra && extra.name.trim() && want(extra.kind)) {
    rows.unshift(extra);
  }

  const seen = new Set<string>();
  const unique: RelatedTo[] = [];
  for (const item of rows) {
    const name = item.name.trim();
    if (!name) continue;
    const key = keyOf({ kind: item.kind, name });
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ kind: item.kind, name });
  }
  return unique;
}
