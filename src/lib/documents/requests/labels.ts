import { listCrmCompanies } from "@/lib/companies/api";
import { listCrmContacts } from "@/lib/contacts/api";
import { listCrmDeals } from "@/lib/deals/api";
import { fetchLeadList } from "@/lib/leads/api/client";
import type { DocumentRequest } from "@/lib/documents/requests/types";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";

function blank(value?: string) {
  const text = value?.trim() ?? "";
  return !text || text === "—" || text === "-" || text === "–";
}

function needsApplicant(row: DocumentRequest) {
  return Boolean(row.requestedFromId) && (blank(row.requestedFrom) || row.requestedFrom === "Client");
}

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

/** Fill requester, applicant, and related-record names the list payload only stores as ids. */
export async function enrichDocumentRequestLabels(
  rows: DocumentRequest[],
): Promise<DocumentRequest[]> {
  const needsBy = rows.some((row) => blank(row.requestedBy) && row.requestedById);
  const needsFrom = rows.some(needsApplicant);
  const needsDeal = rows.some((row) => blank(row.relatedTo) && row.dealId);
  const needsLead = rows.some((row) => blank(row.relatedTo) && row.leadId);
  const needsContact = rows.some(
    (row) => (blank(row.relatedTo) && row.contactId) || needsApplicant(row),
  );
  const needsCompany = rows.some((row) => blank(row.relatedTo) && row.companyId);
  if (!needsBy && !needsFrom && !needsDeal && !needsLead && !needsContact && !needsCompany) {
    return rows;
  }

  const [members, contacts, deals, leads, companies] = await Promise.all([
    needsBy ? safe(() => listCrmWorkspaceMembers(), []) : [],
    needsContact ? safe(() => listCrmContacts({ page: 1, limit: 100 }), []) : [],
    needsDeal ? safe(() => listCrmDeals({ page: 1, limit: 100 }), []) : [],
    needsLead ? safe(() => fetchLeadList({ page: 1, limit: 100 }), []) : [],
    needsCompany ? safe(() => listCrmCompanies({ page: 1, limit: 100 }), []) : [],
  ]);

  const people = new Map<string, string>();
  for (const member of members) {
    if (!member.name.trim()) continue;
    people.set(member.userId, member.name);
    people.set(member.id, member.name);
  }
  const contactNames = new Map<string, string>();
  for (const row of contacts) {
    if (row.contact.id && row.contact.name.trim()) {
      contactNames.set(row.contact.id, row.contact.name);
    }
  }
  const dealNames = new Map(deals.map((deal) => [deal.id, deal.name]));
  const leadNames = new Map(
    leads.map((lead) => [
      lead.id,
      [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || lead.email,
    ]),
  );
  const companyNames = new Map(
    companies.map((row) => [row.company.id, row.company.name]),
  );

  return rows.map((row) => {
    const requestedBy =
      !blank(row.requestedBy)
        ? row.requestedBy
        : (row.requestedById && people.get(row.requestedById)) || row.requestedBy;
    const requestedFrom = needsApplicant(row)
      ? contactNames.get(row.requestedFromId ?? "") || row.requestedFrom
      : row.requestedFrom;
    const relatedTo = !blank(row.relatedTo)
      ? row.relatedTo
      : (row.dealId && dealNames.get(row.dealId)) ||
        (row.leadId && leadNames.get(row.leadId)) ||
        (row.contactId && contactNames.get(row.contactId)) ||
        (row.companyId && companyNames.get(row.companyId)) ||
        row.relatedTo;
    return { ...row, requestedBy, requestedFrom, relatedTo: relatedTo || undefined };
  });
}
