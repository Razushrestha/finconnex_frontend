/** Merge Contacts / Companies (SRS §3.2 / §3.3). */

import {
  findContactById,
  listContactGroups,
  saveContactGroups,
  deleteContact,
} from "@/lib/contacts/store";
import type { ContactCardData } from "@/lib/contacts/types";
import {
  findCompanyById,
  listCompanyGroups,
  saveCompanyGroups,
  deleteCompany,
} from "@/lib/companies/store";
import type { CompanyCardData } from "@/lib/companies/types";
import { softDeleteRecord } from "@/lib/rules/actor";

export type MergeFieldChoice = "primary" | "secondary";

export interface ContactMergeChoices {
  name: MergeFieldChoice;
  email: MergeFieldChoice;
  phone: MergeFieldChoice;
  mobile: MergeFieldChoice;
  company: MergeFieldChoice;
  owner: MergeFieldChoice;
  source: MergeFieldChoice;
}

export interface CompanyMergeChoices {
  name: MergeFieldChoice;
  website: MergeFieldChoice;
  industry: MergeFieldChoice;
  phone: MergeFieldChoice;
  city: MergeFieldChoice;
  annualRevenue: MergeFieldChoice;
  owner: MergeFieldChoice;
}

function pick<T>(
  primary: T,
  secondary: T,
  choice: MergeFieldChoice,
): T {
  return choice === "primary" ? primary : secondary;
}

export function defaultContactMergeChoices(): ContactMergeChoices {
  return {
    name: "primary",
    email: "primary",
    phone: "primary",
    mobile: "primary",
    company: "primary",
    owner: "primary",
    source: "primary",
  };
}

export function defaultCompanyMergeChoices(): CompanyMergeChoices {
  return {
    name: "primary",
    website: "primary",
    industry: "primary",
    phone: "primary",
    city: "primary",
    annualRevenue: "primary",
    owner: "primary",
  };
}

export function mergeContacts(input: {
  primaryId: string;
  secondaryId: string;
  choices: ContactMergeChoices;
}): { ok: true; contact: ContactCardData } | { ok: false; message: string } {
  if (input.primaryId === input.secondaryId) {
    return { ok: false, message: "Select two different contacts" };
  }
  const primary = findContactById(input.primaryId);
  const secondary = findContactById(input.secondaryId);
  if (!primary || !secondary) {
    return { ok: false, message: "One or both contacts were not found" };
  }

  const p = primary.contact;
  const s = secondary.contact;
  const c = input.choices;

  const name = pick(p.name, s.name, c.name);
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length === 1
      ? parts[0]!.slice(0, 2).toUpperCase()
      : `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();

  const merged: ContactCardData = {
    ...p,
    name,
    initials,
    email: pick(p.email, s.email, c.email),
    phone: pick(p.phone, s.phone, c.phone),
    mobile: pick(p.mobile, s.mobile, c.mobile),
    company: pick(p.company, s.company, c.company),
    owner: pick(p.owner, s.owner, c.owner),
    source: pick(p.source, s.source, c.source),
  };

  const gate = softDeleteRecord({
    action: "sales.contacts.delete",
    module: "sales.contacts",
    recordId: s.id,
    recordLabel: s.name,
    recordType: "Contact",
    snapshot: { contact: s, status: secondary.status },
  });
  if (!gate.ok) return { ok: false, message: gate.message };

  deleteContact(s.id);

  const groups = listContactGroups().map((g) => ({
    ...g,
    contacts: g.contacts.map((ct) => (ct.id === p.id ? merged : ct)),
  }));
  saveContactGroups(groups);

  return { ok: true, contact: merged };
}

export function mergeCompanies(input: {
  primaryId: string;
  secondaryId: string;
  choices: CompanyMergeChoices;
}): { ok: true; company: CompanyCardData } | { ok: false; message: string } {
  if (input.primaryId === input.secondaryId) {
    return { ok: false, message: "Select two different companies" };
  }
  const primary = findCompanyById(input.primaryId);
  const secondary = findCompanyById(input.secondaryId);
  if (!primary || !secondary) {
    return { ok: false, message: "One or both companies were not found" };
  }

  const p = primary.company;
  const s = secondary.company;
  const c = input.choices;

  const name = pick(p.name, s.name, c.name);
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length === 1
      ? parts[0]!.slice(0, 2).toUpperCase()
      : `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();

  const merged: CompanyCardData = {
    ...p,
    name,
    initials,
    website: pick(p.website, s.website, c.website),
    industry: pick(p.industry, s.industry, c.industry),
    phone: pick(p.phone, s.phone, c.phone),
    city: pick(p.city, s.city, c.city),
    annualRevenue: pick(p.annualRevenue, s.annualRevenue, c.annualRevenue),
    owner: pick(p.owner, s.owner, c.owner),
  };

  const gate = softDeleteRecord({
    action: "sales.companies.delete",
    module: "sales.companies",
    recordId: s.id,
    recordLabel: s.name,
    recordType: "Company",
    snapshot: { company: s, status: secondary.status },
  });
  if (!gate.ok) return { ok: false, message: gate.message };

  deleteCompany(s.id);

  const groups = listCompanyGroups().map((g) => ({
    ...g,
    companies: g.companies.map((co) => (co.id === p.id ? merged : co)),
  }));
  saveCompanyGroups(groups);

  void import("@/lib/companies/api").then(({ mergeCrmCompanies, tryCrmCompany }) => {
    void tryCrmCompany(() =>
      mergeCrmCompanies({
        survivorId: input.primaryId,
        sourceId: input.secondaryId,
      }),
    );
  });

  return { ok: true, company: merged };
}
