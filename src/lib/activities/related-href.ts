import { RELATED_ENTITY_KINDS, type RelatedEntityKind, type RelatedTo } from "@/lib/activities/shared";
import { isUuid } from "@/lib/activity-timeline/auth";
import { findCompanyById, findCompanyByName } from "@/lib/companies/store";
import { findContactById, findContactByName } from "@/lib/contacts/store";
import { findDealById, listAllDeals } from "@/lib/deals/store";
import { findLeadById, listLeadColumns } from "@/lib/leads/store";

export function parseRelatedTo(
  relatedTo?: string,
): { kind: RelatedEntityKind; name: string } | null {
  if (!relatedTo?.trim()) return null;
  const match = relatedTo.trim().match(/^([^:]+):\s*(.+)$/);
  if (!match) return null;
  const rawKind = match[1]!.trim();
  const name = match[2]!.trim();
  if (!name) return null;
  const kind = RELATED_ENTITY_KINDS.find(
    (k) => k.toLowerCase() === rawKind.toLowerCase(),
  );
  if (!kind) return null;
  return { kind, name };
}

function eqName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function hrefForRelatedKindId(
  kind: RelatedEntityKind,
  id: string,
): string {
  const safe = encodeURIComponent(id);
  if (kind === "Deal") return `/sales/deals/detail/${safe}`;
  if (kind === "Company") return `/sales/companies/detail/${safe}`;
  if (kind === "Contact") return `/sales/contacts/detail/${safe}`;
  return `/sales/leads/detail/${safe}`;
}

/** Resolve a related record to its CRM detail page, preferring UUID ids. */
export function hrefForRelatedTo(
  relatedTo?: string | RelatedTo | null,
): string | null {
  if (!relatedTo) return null;

  if (typeof relatedTo === "object") {
    if (relatedTo.id && (isUuid(relatedTo.id) || relatedTo.id.trim())) {
      if (isUuid(relatedTo.id)) {
        return hrefForRelatedKindId(relatedTo.kind, relatedTo.id);
      }
      if (relatedTo.kind === "Deal") {
        const found = findDealById(relatedTo.id);
        if (found) return hrefForRelatedKindId("Deal", found.deal.id);
      }
      if (relatedTo.kind === "Company") {
        const found = findCompanyById(relatedTo.id);
        if (found) return hrefForRelatedKindId("Company", found.company.id);
      }
      if (relatedTo.kind === "Contact") {
        const found = findContactById(relatedTo.id);
        if (found) return hrefForRelatedKindId("Contact", found.contact.id);
      }
      if (relatedTo.kind === "Lead") {
        const found = findLeadById(relatedTo.id);
        if (found) return hrefForRelatedKindId("Lead", found.card.id);
      }
    }
    if (relatedTo.name.trim()) {
      return hrefForRelatedTo(`${relatedTo.kind}: ${relatedTo.name}`);
    }
    return null;
  }

  const parsed = parseRelatedTo(relatedTo);
  if (!parsed) return null;
  const { kind, name } = parsed;

  if (kind === "Deal") {
    const deal = listAllDeals().find((d) => eqName(d.name, name));
    return deal ? hrefForRelatedKindId("Deal", deal.id) : "/sales/deals";
  }

  if (kind === "Company") {
    const found = findCompanyByName(name);
    return found
      ? hrefForRelatedKindId("Company", found.company.id)
      : "/sales/companies";
  }

  if (kind === "Contact") {
    const contact = findContactByName(name);
    return contact
      ? hrefForRelatedKindId("Contact", contact.id)
      : "/sales/contacts";
  }

  if (kind === "Lead") {
    for (const col of listLeadColumns()) {
      const card = col.cards.find((c) => eqName(c.name, name));
      if (card) return hrefForRelatedKindId("Lead", card.id);
    }
    return "/sales/leads";
  }

  return null;
}
