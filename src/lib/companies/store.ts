/** Live company board store: session-backed. */

import {
  COMPANY_GROUPS,
  type CompanyCardData,
  type CompanyGroup,
  type CompanyStatus,
} from "@/lib/companies/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { newRulesId } from "@/lib/rules/storage";

const AVATAR_COLORS = [
  "bg-amber-50 text-amber-600",
  "bg-pink-50 text-pink-600",
  "bg-teal-50 text-teal-600",
  "bg-blue-50 text-blue-600",
  "bg-indigo-50 text-indigo-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
];

function cloneSeed(): CompanyGroup[] {
  return COMPANY_GROUPS.map((g) => ({
    ...g,
    companies: g.companies.map((c) => ({ ...c })),
  }));
}

const board = createBoardStore({
  key: "sales:companies:board:v1",
  seed: cloneSeed,
});

export function listCompanyGroups(): CompanyGroup[] {
  return board.list().map((g) => ({
    ...g,
    companies: g.companies.map((c) => ({ ...c })),
  }));
}

export function saveCompanyGroups(groups: CompanyGroup[]) {
  board.save(
    groups.map((g) => ({
      ...g,
      companies: g.companies.map((c) => ({ ...c })),
    })),
  );
}

export function listCompanyNames(): string[] {
  return listCompanyGroups().flatMap((g) =>
    g.companies.map((c) => c.name.trim().toLowerCase()),
  );
}

export function findCompanyById(id: string) {
  for (const g of listCompanyGroups()) {
    const company = g.companies.find((c) => c.id === id);
    if (company)
      return { company, status: g.title as CompanyStatus, groupId: g.id };
  }
  return null;
}

export function findCompanyByName(name: string) {
  const key = name.trim().toLowerCase();
  for (const g of listCompanyGroups()) {
    const company = g.companies.find((c) => c.name.trim().toLowerCase() === key);
    if (company)
      return { company, status: g.title as CompanyStatus, groupId: g.id };
  }
  return null;
}

export function updateCompany(
  id: string,
  patch: Partial<Pick<CompanyCardData, "name" | "tags">>,
): CompanyCardData | null {
  const found = findCompanyById(id);
  if (!found) return null;
  let next: CompanyCardData | null = null;
  saveCompanyGroups(
    listCompanyGroups().map((g) => ({
      ...g,
      companies: g.companies.map((c) => {
        if (c.id !== id) return c;
        next = {
          ...c,
          ...patch,
          name: patch.name?.trim() || c.name,
        };
        return next;
      }),
    })),
  );
  return next;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function createCompany(input: {
  name: string;
  website?: string;
  industry?: string;
  phone?: string;
  city?: string;
  annualRevenue?: string;
  status: CompanyStatus;
  owner: string;
}): CompanyCardData {
  const groups = listCompanyGroups();
  const target =
    groups.find((g) => g.title === input.status) ??
    groups.find((g) => g.title === "Prospect") ??
    groups[0]!;
  const name = input.name.trim();
  const avatarIndex = groups.reduce((n, g) => n + g.companies.length, 0);
  const company: CompanyCardData = {
    id: newRulesId("co"),
    name,
    initials: initialsFromName(name),
    website: input.website?.trim() || "",
    industry: input.industry?.trim() || "",
    phone: input.phone?.trim() || "",
    owner: input.owner,
    annualRevenue: input.annualRevenue?.trim() || undefined,
    city: input.city?.trim() || undefined,
    accentColorClass: target.dotColorClass,
    avatarBgClass: AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length],
  };

  saveCompanyGroups(
    groups.map((g) =>
      g.id === target.id
        ? { ...g, companies: [company, ...g.companies] }
        : g,
    ),
  );
  void import("@/lib/companies/api").then(async ({ createCrmCompany, tryCrmCompany }) => {
    const remote = await tryCrmCompany(() => createCrmCompany(input));
    if (!remote) return;
    if (remote.company.id !== company.id) {
      deleteCompany(company.id, { skipCrm: true });
    }
    mergeCrmCompaniesIntoBoard([remote]);
  });
  return company;
}

export function deleteCompany(
  id: string,
  opts?: { skipCrm?: boolean },
): CompanyCardData | null {
  const found = findCompanyById(id);
  if (!found) return null;
  saveCompanyGroups(
    listCompanyGroups().map((g) => ({
      ...g,
      companies: g.companies.filter((c) => c.id !== id),
    })),
  );
  if (!opts?.skipCrm) {
    void import("@/lib/companies/api").then(({ deleteCrmCompany, tryCrmCompany }) => {
      void tryCrmCompany(() => deleteCrmCompany(id));
    });
  }
  return found.company;
}

export function updateCompany(
  id: string,
  patch: Partial<CompanyCardData> & { status?: CompanyStatus },
): CompanyCardData | null {
  const found = findCompanyById(id);
  if (!found) return null;
  const nextStatus = patch.status ?? found.status;
  const merged: CompanyCardData = {
    ...found.company,
    ...patch,
    id,
    accentColorClass:
      nextStatus !== found.status
        ? (listCompanyGroups().find((g) => g.title === nextStatus)?.dotColorClass ??
          found.company.accentColorClass)
        : found.company.accentColorClass,
  };

  let groups = listCompanyGroups().map((g) => ({
    ...g,
    companies: g.companies.filter((c) => c.id !== id),
  }));
  const target =
    groups.find((g) => g.title === nextStatus) ??
    groups.find((g) => g.id === found.groupId) ??
    groups[0];
  if (!target) return null;
  groups = groups.map((g) =>
    g.id === target.id ? { ...g, companies: [merged, ...g.companies] } : g,
  );
  saveCompanyGroups(groups);

  void import("@/lib/companies/api").then(({ updateCrmCompany, tryCrmCompany }) => {
    void tryCrmCompany(() =>
      updateCrmCompany(id, {
        name: patch.name,
        website: patch.website,
        industry: patch.industry,
        phone: patch.phone,
        city: patch.city,
        annualRevenue: patch.annualRevenue,
        status: nextStatus,
        owner: patch.owner,
      }),
    );
  });
  return merged;
}

export function mergeCrmCompaniesIntoBoard(
  remote: Array<{ company: CompanyCardData; status: CompanyStatus }>,
) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((r) => r.company.id));
  let groups = listCompanyGroups().map((g) => ({
    ...g,
    companies: g.companies.filter((c) => !remoteIds.has(c.id)),
  }));
  for (const item of remote) {
    const target =
      groups.find((g) => g.title === item.status) ??
      groups.find((g) => g.title === "Prospect") ??
      groups[0];
    if (!target) continue;
    const company: CompanyCardData = {
      ...item.company,
      accentColorClass: target.dotColorClass,
    };
    groups = groups.map((g) =>
      g.id === target.id
        ? { ...g, companies: [company, ...g.companies] }
        : g,
    );
  }
  saveCompanyGroups(groups);
}
