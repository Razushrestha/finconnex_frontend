import { listDealPipelines } from "@/lib/deals/store";
import { findContactByEmail, findContactByName } from "@/lib/contacts/store";
import { listLeadColumns } from "@/lib/leads/store";

export type RelatedRecordKind = "deal" | "lead";

export interface RelatedRecord {
  id: string;
  kind: RelatedRecordKind;
  title: string;
  stage: string;
  href: string;
  progress: number;
  total: number;
}

function norm(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export function relatedRecordsForPerson(name?: string, email?: string): RelatedRecord[] {
  const n = norm(name);
  const e = norm(email);
  const contact =
    (e ? findContactByEmail(e) : null) ?? (n ? findContactByName(n) : null);
  const contactName = norm(contact?.name) || n;
  const dealIds = new Set(contact?.dealIds ?? []);

  const deals: RelatedRecord[] = [];
  for (const stages of Object.values(listDealPipelines())) {
    const total = Math.max(stages.length, 1);
    stages.forEach((stage, index) => {
      for (const deal of stage.deals) {
        const hit =
          (contact && deal.contactId === contact.id) ||
          dealIds.has(deal.id) ||
          (contactName && norm(deal.contact) === contactName);
        if (!hit) continue;
        deals.push({
          id: deal.id,
          kind: "deal",
          title: deal.name,
          stage: stage.title,
          href: `/sales/deals/detail/${deal.id}`,
          progress: index + 1,
          total,
        });
      }
    });
  }

  const leads: RelatedRecord[] = [];
  const columns = listLeadColumns();
  const leadTotal = Math.max(columns.length, 1);
  columns.forEach((column, index) => {
    for (const card of column.cards) {
      const hit =
        (e && norm(card.email) === e) ||
        (contactName && norm(card.name) === contactName) ||
        (contact && card.convertedContactId === contact.id);
      if (!hit) continue;
      leads.push({
        id: card.id,
        kind: "lead",
        title: card.name,
        stage: column.title,
        href: `/sales/leads/detail/${card.id}`,
        progress: index + 1,
        total: leadTotal,
      });
    }
  });

  const found = [...deals, ...leads];
  if (found.length) return found;
  if (e) return [];

  const label = name?.includes("@") ? "this contact" : name || "Sarah Johnson";
  return [
    {
      id: "demo-deal-1",
      kind: "deal" as const,
      title: "Home Loan Pre-Approval",
      stage: "Document Request",
      href: "/sales/deals",
      progress: 4,
      total: 6,
    },
    {
      id: "demo-deal-2",
      kind: "deal" as const,
      title: "Investment loan — second property",
      stage: "Qualification",
      href: "/sales/deals",
      progress: 2,
      total: 6,
    },
    {
      id: "demo-lead-1",
      kind: "lead" as const,
      title: `${label} — New enquiry`,
      stage: "New Lead",
      href: "/sales/leads",
      progress: 1,
      total: 6,
    },
  ];
}
