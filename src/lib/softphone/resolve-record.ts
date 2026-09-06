import { listAllContacts } from "@/lib/contacts/store";
import { listLeadColumns } from "@/lib/leads/store";
import { listAllDeals } from "@/lib/deals/store";
import { listCompanyGroups } from "@/lib/companies/store";

export type SoftphoneRecordKind = "Lead" | "Deal" | "Company" | "Contact";

export interface SoftphoneRecord {
  kind: SoftphoneRecordKind;
  id: string;
  name: string;
  phone?: string;
  relatedTo: string;
  href: string;
  initials: string;
  avatarClass: string;
  company?: string;
  tags?: string[];
}

function digits(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

export function phonesMatch(a?: string, b?: string) {
  const da = digits(a);
  const db = digits(b);
  if (da.length < 6 || db.length < 6) return false;
  return da === db || da.endsWith(db.slice(-8)) || db.endsWith(da.slice(-8));
}

function namesMatch(a?: string, b?: string) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** Lead → Deal → Organization (company) → Contact. */
export function resolveSoftphoneRecord(input: {
  phone?: string;
  name?: string;
}): SoftphoneRecord | null {
  const phone = input.phone?.trim();
  const name = input.name?.trim();
  if (!phone && !name) return null;

  for (const col of listLeadColumns()) {
    const lead = col.cards.find(
      (c) =>
        phonesMatch(c.phone, phone) ||
        phonesMatch(c.mobilePhone, phone) ||
        phonesMatch(c.custom?.mobile, phone) ||
        phonesMatch(c.custom?.["secondary.mobile"], phone) ||
        phonesMatch(c.custom?.["secondary.phone"], phone) ||
        namesMatch(c.name, name) ||
        namesMatch(
          [c.custom?.firstName, c.custom?.surname || c.custom?.lastName]
            .filter(Boolean)
            .join(" "),
          name,
        ) ||
        namesMatch(
          [
            c.custom?.["secondary.firstName"],
            c.custom?.["secondary.surname"] || c.custom?.["secondary.lastName"],
          ]
            .filter(Boolean)
            .join(" "),
          name,
        ),
    );
    if (lead) {
      return {
        kind: "Lead",
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        relatedTo: `Lead: ${lead.name}`,
        href: `/sales/leads/detail/${encodeURIComponent(lead.id)}`,
        initials: lead.initials || initialsOf(lead.name),
        avatarClass: "bg-violet-100 text-violet-700",
        company: lead.company,
        tags: lead.tags,
      };
    }
  }

  const deal = listAllDeals().find(
    (d) => namesMatch(d.contact, name) || namesMatch(d.name, name),
  );
  if (deal) {
    return {
      kind: "Deal",
      id: deal.id,
      name: deal.name,
      relatedTo: `Deal: ${deal.name}`,
      href: `/sales/deals/detail/${encodeURIComponent(deal.id)}`,
      initials: deal.initials || initialsOf(deal.name),
      avatarClass: deal.avatarBgClass || "bg-amber-100 text-amber-700",
      company: deal.account,
    };
  }

  for (const group of listCompanyGroups()) {
    const company = group.companies.find(
      (c) => phonesMatch(c.phone, phone) || namesMatch(c.name, name),
    );
    if (company) {
      return {
        kind: "Company",
        id: company.id,
        name: company.name,
        phone: company.phone,
        relatedTo: `Company: ${company.name}`,
        href: "/sales/companies",
        initials: company.initials || initialsOf(company.name),
        avatarClass: company.avatarBgClass || "bg-sky-100 text-sky-700",
      };
    }
  }

  const contact = listAllContacts().find(
    (c) =>
      phonesMatch(c.phone, phone) ||
      phonesMatch(c.mobile, phone) ||
      namesMatch(c.name, name),
  );
  if (contact) {
    return {
      kind: "Contact",
      id: contact.id,
      name: contact.name,
      phone: contact.mobile || contact.phone,
      relatedTo: `Contact: ${contact.name}`,
      href: `/sales/contacts/detail/${encodeURIComponent(contact.id)}`,
      initials: contact.initials || initialsOf(contact.name),
      avatarClass: contact.avatarBgClass || "bg-emerald-100 text-emerald-700",
      company: contact.company,
    };
  }

  return null;
}

export function labelForRecord(record: SoftphoneRecord | null, fallback?: string) {
  if (record) return `${record.kind}: ${record.name}`;
  return fallback || "Unlinked number";
}
