import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  CompanyCardData,
  CompanyStatus,
} from "@/lib/companies/types";

export type CrmCompanyQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

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

const STATUS_DOT: Record<CompanyStatus, string> = {
  Active: "bg-sky-500",
  Inactive: "bg-slate-400",
  Prospect: "bg-amber-400",
  Customer: "bg-emerald-500",
  Partner: "bg-violet-500",
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function companiesPath(suffix = ""): string {
  return `/v1/companies${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as { items?: unknown; companies?: unknown };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.companies)) return extractRecords(rec.companies);
  }
  return [];
}

export function mapCompanyStatus(raw: string): CompanyStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("inactive") || value.includes("disabled")) return "Inactive";
  if (value.includes("prospect") || value.includes("lead")) return "Prospect";
  if (value.includes("customer") || value.includes("client")) return "Customer";
  if (value.includes("partner")) return "Partner";
  if (value.includes("active")) return "Active";
  return "Prospect";
}

function apiStatus(status: CompanyStatus): string {
  return status.toUpperCase().replace(/ /g, "_");
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export type NormalizedCrmCompany = {
  company: CompanyCardData;
  status: CompanyStatus;
};

export function normalizeCrmCompany(
  raw: Record<string, unknown>,
  index: number,
): NormalizedCrmCompany {
  const owner =
    raw.owner && typeof raw.owner === "object"
      ? (raw.owner as Record<string, unknown>)
      : null;
  const name = pickStr(raw.name, raw.companyName, raw.title, "Untitled company");
  const status = mapCompanyStatus(
    pickStr(raw.status, raw.lifecycleStage, raw.state, "PROSPECT"),
  );
  const id = pickStr(raw.id, raw.uuid, raw.companyId) || `crm-co-${index}`;

  return {
    status,
    company: {
      id,
      name,
      initials: pickStr(raw.initials) || initialsFromName(name),
      website: pickStr(raw.website, raw.domain, raw.url),
      industry: pickStr(raw.industry, raw.sector),
      phone: pickStr(raw.phone, raw.phoneNumber, raw.primaryPhone),
      owner: pickStr(
        owner && pickStr(owner.name, owner.email),
        raw.ownerName,
        raw.assignedTo,
        raw.owner,
        "—",
      ),
      annualRevenue: pickStr(raw.annualRevenue, raw.revenue) || undefined,
      city: pickStr(raw.city, raw.location, raw.addressCity) || undefined,
      accentColorClass: STATUS_DOT[status],
      avatarBgClass: AVATAR_COLORS[index % AVATAR_COLORS.length],
    },
  };
}

export function normalizeCrmCompanies(data: unknown): NormalizedCrmCompany[] {
  return extractRecords(data).map((row, index) =>
    normalizeCrmCompany(row, index),
  );
}

async function companiesGet(suffix: string, query = ""): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load companies");
  return crmFetch(auth, `${companiesPath(suffix)}${query}`);
}

async function companiesMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage companies");
  return crmFetch(auth, companiesPath(suffix), init);
}

export async function listCrmCompanies(
  query: CrmCompanyQuery = {},
): Promise<NormalizedCrmCompany[]> {
  return normalizeCrmCompanies(
    await companiesGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
}

export async function getCrmCompany(
  id: string,
): Promise<NormalizedCrmCompany | null> {
  const data = await companiesGet(`/${id}`);
  const items = normalizeCrmCompanies(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCrmCompany(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function getCrmCompanyTransfer(
  transferId: string,
): Promise<unknown> {
  return companiesGet(`/transfers/${transferId}`);
}

export async function createCrmCompany(input: {
  name: string;
  website?: string;
  industry?: string;
  phone?: string;
  city?: string;
  annualRevenue?: string;
  status: CompanyStatus;
  owner: string;
}): Promise<NormalizedCrmCompany | null> {
  const data = await companiesMutate("", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      website: input.website,
      industry: input.industry,
      phone: input.phone,
      city: input.city,
      annualRevenue: input.annualRevenue,
      status: apiStatus(input.status),
      ownerName: input.owner,
      owner: input.owner,
    }),
  });
  const items = normalizeCrmCompanies(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCrmCompany(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function updateCrmCompany(
  id: string,
  patch: Partial<{
    name: string;
    website: string;
    industry: string;
    phone: string;
    city: string;
    annualRevenue: string;
    status: CompanyStatus;
    owner: string;
  }>,
): Promise<NormalizedCrmCompany | null> {
  const body: Record<string, unknown> = {};
  if (patch.name != null) body.name = patch.name;
  if (patch.website != null) body.website = patch.website;
  if (patch.industry != null) body.industry = patch.industry;
  if (patch.phone != null) body.phone = patch.phone;
  if (patch.city != null) body.city = patch.city;
  if (patch.annualRevenue != null) body.annualRevenue = patch.annualRevenue;
  if (patch.status != null) body.status = apiStatus(patch.status);
  if (patch.owner != null) {
    body.ownerName = patch.owner;
    body.owner = patch.owner;
  }
  const data = await companiesMutate(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const items = normalizeCrmCompanies(data);
  return items[0] ?? null;
}

export async function deleteCrmCompany(id: string): Promise<void> {
  await companiesMutate(`/${id}`, { method: "DELETE" });
}

export async function bulkCrmCompanies(input: {
  ids: string[];
  operation: string;
  payload?: Record<string, unknown>;
}): Promise<unknown> {
  return companiesMutate("/bulk", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function importCrmCompanies(input: {
  rows: Record<string, unknown>[];
}): Promise<unknown> {
  return companiesMutate("/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function exportCrmCompanies(input: {
  ids?: string[];
} = {}): Promise<unknown> {
  return companiesMutate("/export", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function mergeCrmCompanies(input: {
  survivorId: string;
  sourceId: string;
}): Promise<NormalizedCrmCompany | null> {
  const data = await companiesMutate(`/${input.survivorId}/merge`, {
    method: "POST",
    body: JSON.stringify({
      sourceId: input.sourceId,
      sourceCompanyId: input.sourceId,
      mergeFromId: input.sourceId,
    }),
  });
  const items = normalizeCrmCompanies(data);
  return items[0] ?? null;
}

export async function tryCrmCompany<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
