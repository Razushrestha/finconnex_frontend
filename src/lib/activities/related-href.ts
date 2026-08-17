import { RELATED_ENTITY_KINDS, type RelatedEntityKind } from "@/lib/activities/shared";
import { findCompanyByName } from "@/lib/companies/store";
import { findContactByName } from "@/lib/contacts/store";
import { listAllDeals } from "@/lib/deals/store";
import { listLeadColumns } from "@/lib/leads/store";

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

/** Resolve "Deal: Atlas CRM Rollout" (etc.) to the matching CRM record page. */
export function hrefForRelatedTo(relatedTo?: string): string | null {
  const parsed = parseRelatedTo(relatedTo);
  if (!parsed) return null;
  const { kind, name } = parsed;

  if (kind === "Deal") {
    const deal = listAllDeals().find((d) => eqName(d.name, name));
    return deal ? `/sales/deals/detail/${deal.id}` : "/sales/deals";
  }

  if (kind === "Company") {
    const found = findCompanyByName(name);
    return found
      ? `/sales/companies?focus=${encodeURIComponent(found.company.id)}`
      : "/sales/companies";
  }

  if (kind === "Contact") {
    const contact = findContactByName(name);
    return contact
      ? `/sales/contacts/detail/${contact.id}`
      : "/sales/contacts";
  }

  if (kind === "Lead") {
    for (const col of listLeadColumns()) {
      const card = col.cards.find((c) => eqName(c.name, name));
      if (card) return `/sales/leads/detail/${card.id}`;
    }
    return "/sales/leads";
  }

  return null;
}
