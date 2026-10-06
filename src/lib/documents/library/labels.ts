import { listCrmCompanies } from "@/lib/companies/api";
import { listCrmContacts } from "@/lib/contacts/api";
import { listCrmDeals } from "@/lib/deals/api";
import { fetchLeadList } from "@/lib/leads/api/client";
import type { LibraryDocument } from "@/lib/documents/library/types";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";

function blank(value?: string) {
  const text = value?.trim() ?? "";
  return !text || text === "—" || text === "-" || text === "–";
}

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

function titled(kind: string, name?: string) {
  const text = name?.trim() ?? "";
  return text ? `${kind}: ${text}` : "";
}

/** Fill owner and related-record names the document list only stores as ids. */
export async function enrichLibraryDocumentLabels(
  rows: LibraryDocument[],
): Promise<LibraryDocument[]> {
  const needsOwner = rows.some((row) => blank(row.owner) && row.ownerId);
  const needsDeal = rows.some((row) => blank(row.relatedTo) && row.dealId);
  const needsLead = rows.some((row) => blank(row.relatedTo) && row.leadId);
  const needsContact = rows.some((row) => blank(row.relatedTo) && row.contactId);
  const needsCompany = rows.some((row) => blank(row.relatedTo) && row.companyId);
  if (!needsOwner && !needsDeal && !needsLead && !needsContact && !needsCompany) {
    return rows;
  }

  const [members, contacts, deals, leads, companies] = await Promise.all([
    needsOwner ? safe(() => listCrmWorkspaceMembers(), []) : [],
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
    const ownerName = blank(row.owner)
      ? (row.ownerId && people.get(row.ownerId)) || ""
      : row.owner;
    const relatedTo = !blank(row.relatedTo)
      ? row.relatedTo
      : titled("Deal", row.dealId ? dealNames.get(row.dealId) : "") ||
        titled("Lead", row.leadId ? leadNames.get(row.leadId) : "") ||
        titled("Contact", row.contactId ? contactNames.get(row.contactId) : "") ||
        titled("Company", row.companyId ? companyNames.get(row.companyId) : "") ||
        row.relatedTo;
    return {
      ...row,
      owner: ownerName || row.owner,
      relatedTo: relatedTo || undefined,
      versions: row.versions.map((version) =>
        blank(version.uploadedBy) && ownerName
          ? { ...version, uploadedBy: ownerName }
          : version,
      ),
    };
  });
}
