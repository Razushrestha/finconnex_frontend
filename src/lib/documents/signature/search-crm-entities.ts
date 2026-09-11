import { listCrmCompanies, tryCrmCompany } from "@/lib/companies/api";
import { listCompanyGroups } from "@/lib/companies/store";
import { listCrmContacts, tryCrmContact } from "@/lib/contacts/api";
import { findContactById, listAllContacts } from "@/lib/contacts/store";
import { listCrmDeals, tryCrmDeal } from "@/lib/deals/api";
import { listAllDeals } from "@/lib/deals/store";
import { fetchLeadList } from "@/lib/leads/api";
import { listLeadColumns } from "@/lib/leads/store";

export type SignatureCrmEntityType =
  | "email"
  | "contact"
  | "lead"
  | "deal"
  | "organization";

export type SignatureCrmEntityOption = {
  id: string;
  name: string;
  email: string;
  type: SignatureCrmEntityType;
  subtitle?: string;
  phone?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function matches(query: string, ...fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => field.toLowerCase().includes(q));
}

function dedupe(
  rows: SignatureCrmEntityOption[],
): SignatureCrmEntityOption[] {
  const seen = new Set<string>();
  const out: SignatureCrmEntityOption[] = [];
  for (const row of rows) {
    const id = row.id.trim().toLowerCase();
    const email = row.email.trim().toLowerCase();
    const key = id || `${row.type}:${row.name.trim().toLowerCase()}:${email}`;
    if (!row.name.trim() && !email) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function contactEmailForDeal(deal: {
  contactId?: string;
  contact?: string;
  account?: string;
}): { email: string; phone?: string; label?: string } {
  if (deal.contactId) {
    const hit = findContactById(deal.contactId);
    if (hit?.contact) {
      return {
        email: clean(hit.contact.email),
        phone: clean(hit.contact.mobile || hit.contact.phone) || undefined,
        label: clean(hit.contact.name),
      };
    }
  }
  const contactName = clean(deal.contact);
  if (contactName) {
    const hit = listAllContacts().find(
      (c) => c.name.trim().toLowerCase() === contactName.toLowerCase(),
    );
    if (hit) {
      return {
        email: clean(hit.email),
        phone: clean(hit.mobile || hit.phone) || undefined,
        label: hit.name,
      };
    }
  }
  const account = clean(deal.account);
  if (account.includes("@")) return { email: account };
  return { email: "" };
}

function contactEmailForCompany(name: string, companyId?: string): string {
  const contacts = listAllContacts();
  if (companyId) {
    const byId = contacts.find((c) => c.companyId === companyId && c.email);
    if (byId) return clean(byId.email);
  }
  const q = name.trim().toLowerCase();
  if (!q) return "";
  const byName = contacts.find(
    (c) => c.company.trim().toLowerCase() === q && c.email,
  );
  return byName ? clean(byName.email) : "";
}

async function searchLeads(query: string): Promise<SignatureCrmEntityOption[]> {
  const rows: SignatureCrmEntityOption[] = [];
  let remote: Awaited<ReturnType<typeof fetchLeadList>> = [];
  try {
    remote = await fetchLeadList({
      limit: 100,
      search: query || undefined,
    });
    if (query && remote.length === 0) {
      remote = await fetchLeadList({ limit: 100 });
    }
  } catch {
    try {
      remote = await fetchLeadList({ limit: 100 });
    } catch {
      remote = [];
    }
  }
  for (const lead of remote) {
    const name =
      `${clean(lead.firstName)} ${clean(lead.lastName)}`.trim() ||
      clean(lead.email) ||
      "Untitled lead";
    rows.push({
      id: lead.id,
      name,
      email: clean(lead.email),
      type: "lead",
      subtitle: clean(lead.companyName) || clean(lead.status) || undefined,
      phone: clean(lead.mobilePhone) || clean(lead.phone) || undefined,
    });
  }
  for (const column of listLeadColumns()) {
    for (const card of column.cards) {
      rows.push({
        id: card.id,
        name: card.name,
        email: clean(card.email),
        type: "lead",
        subtitle: clean(card.company) || column.title,
        phone: clean(card.mobilePhone || card.phone) || undefined,
      });
    }
  }
  return rows;
}

async function searchContacts(
  query: string,
): Promise<SignatureCrmEntityOption[]> {
  const rows: SignatureCrmEntityOption[] = [];
  const remote = await tryCrmContact(() =>
    listCrmContacts({ limit: 100, search: query || undefined }),
  );
  for (const item of remote ?? []) {
    rows.push({
      id: item.contact.id,
      name:
        clean(item.contact.name) ||
        clean(item.contact.email) ||
        "Untitled contact",
      email: clean(item.contact.email),
      type: "contact",
      subtitle: clean(item.contact.company) || undefined,
      phone:
        clean(item.contact.mobile || item.contact.phone) || undefined,
    });
  }
  for (const contact of listAllContacts()) {
    rows.push({
      id: contact.id,
      name: contact.name,
      email: clean(contact.email),
      type: "contact",
      subtitle: clean(contact.company) || undefined,
      phone: clean(contact.mobile || contact.phone) || undefined,
    });
  }
  return rows;
}

async function searchDeals(query: string): Promise<SignatureCrmEntityOption[]> {
  const rows: SignatureCrmEntityOption[] = [];
  const remote = await tryCrmDeal(() =>
    listCrmDeals({ limit: 100, search: query || undefined }),
  );
  for (const deal of remote ?? []) {
    const linked = contactEmailForDeal(deal);
    rows.push({
      id: deal.id,
      name: clean(deal.name) || "Untitled deal",
      email: linked.email,
      type: "deal",
      subtitle: linked.label || clean(deal.account) || undefined,
      phone: linked.phone,
    });
  }
  for (const deal of listAllDeals()) {
    const linked = contactEmailForDeal(deal);
    rows.push({
      id: deal.id,
      name: deal.name,
      email: linked.email,
      type: "deal",
      subtitle: linked.label || clean(deal.account) || undefined,
      phone: linked.phone,
    });
  }
  return rows;
}

async function searchOrganizations(
  query: string,
): Promise<SignatureCrmEntityOption[]> {
  const rows: SignatureCrmEntityOption[] = [];
  const remote = await tryCrmCompany(() =>
    listCrmCompanies({ limit: 100, search: query || undefined }),
  );
  for (const item of remote ?? []) {
    const name = clean(item.company.name) || "Untitled organization";
    rows.push({
      id: item.company.id,
      name,
      email: contactEmailForCompany(name, item.company.id),
      type: "organization",
      subtitle: clean(item.company.website) || clean(item.company.industry) || undefined,
    });
  }
  for (const group of listCompanyGroups()) {
    for (const company of group.companies) {
      rows.push({
        id: company.id,
        name: company.name,
        email: contactEmailForCompany(company.name, company.id),
        type: "organization",
        subtitle: clean(company.website) || clean(company.industry) || undefined,
      });
    }
  }
  return rows;
}

export async function searchSignatureCrmEntities(
  type: SignatureCrmEntityType,
  query: string,
): Promise<SignatureCrmEntityOption[]> {
  if (type === "email") return [];
  const q = query.trim();
  let rows: SignatureCrmEntityOption[] = [];
  switch (type) {
    case "lead":
      rows = await searchLeads(q);
      break;
    case "contact":
      rows = await searchContacts(q);
      break;
    case "deal":
      rows = await searchDeals(q);
      break;
    case "organization":
      rows = await searchOrganizations(q);
      break;
    default:
      return [];
  }
  const filtered = dedupe(rows).filter((row) =>
    matches(q, row.name, row.email, row.subtitle ?? ""),
  );
  return filtered.slice(0, 20);
}
