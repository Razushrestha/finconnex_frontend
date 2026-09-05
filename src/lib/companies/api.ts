import {
  decodeJwtPayload,
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
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

async function companiesFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (isBoundCrmSession()) {
    const scoped = await ensureCrmSession();
    if (scoped) return crmFetch<T>(scoped, path, init);
    const access = await ensureCrmAccess();
    if (!access) throw new Error("Sign in to load companies");
    return crmFetch<T>(access, path, init);
  }
  return crmBffFetch<T>(path, init);
}

function compactBody(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

function transferIdFrom(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  for (const key of ["transferId", "jobId"]) {
    const value = rec[key];
    if (typeof value === "string" && isUuid(value)) return value;
  }
  const nested = rec.data;
  if (nested && nested !== data) return transferIdFrom(nested);
  return null;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return extractRecords(data[0]);
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "companies", "results", "records", "rows", "data"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
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
        typeof raw.owner === "string" ? raw.owner : "",
        "—",
      ),
      ownerId:
        pickStr(raw.ownerId, owner && pickStr(owner.id, owner.userId)) ||
        undefined,
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
  return companiesFetch(`${companiesPath(suffix)}${query}`);
}

async function companiesMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  return companiesFetch(companiesPath(suffix), init);
}

export async function listCrmCompanies(
  query: CrmCompanyQuery = {},
): Promise<NormalizedCrmCompany[]> {
  const page = query.page != null ? Math.max(1, query.page) : 1;
  const limit =
    query.limit != null
      ? Math.min(100, Math.max(1, query.limit))
      : 100;
  return normalizeCrmCompanies(
    await companiesGet(
      "",
      toQuery({
        page,
        limit,
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

function asHttpUrl(raw?: string): string | undefined {
  const value = raw?.trim() ?? "";
  if (!value || /^https?:\/\/$/i.test(value)) return undefined;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!url.hostname || url.hostname === "localhost") {
      if (!value.includes(".")) return undefined;
    }
    if (!url.hostname.includes(".")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function asDecimalMoney(raw?: string): string | undefined {
  const value = raw?.trim() ?? "";
  if (!value) return undefined;
  const numeric = value.replace(/[^0-9.]/g, "");
  if (!numeric) return undefined;
  const amount = Number(numeric);
  if (!Number.isFinite(amount)) return undefined;
  return amount.toFixed(2);
}

function asCompanySize(raw?: string): string | undefined {
  const value = raw?.trim().toUpperCase().replace(/[\s-]+/g, "_") ?? "";
  if (
    value === "SMALL" ||
    value === "MEDIUM" ||
    value === "LARGE" ||
    value === "ENTERPRISE" ||
    value === "MICRO"
  ) {
    return value;
  }
  return undefined;
}

function asEmployeeCount(raw?: string): number | undefined {
  const n = Number(raw?.match(/\d+/)?.[0]);
  return Number.isFinite(n) ? n : undefined;
}

function isPlaceholder(value: string, placeholders: string[]) {
  const key = value.trim().toLowerCase();
  return placeholders.some((p) => p.toLowerCase() === key);
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
  ownerId?: string;
  notes?: string;
  companySize?: string;
  address?: string;
  state?: string;
  country?: string;
}): Promise<NormalizedCrmCompany | null> {
  let ownerId = input.ownerId && isUuid(input.ownerId) ? input.ownerId : undefined;
  if (!ownerId) {
    try {
      const access = await ensureCrmAccess();
      const claims = access?.accessToken
        ? decodeJwtPayload(access.accessToken)
        : null;
      const id = claims?.sub ?? claims?.userId ?? claims?.id;
      if (typeof id === "string" && isUuid(id)) ownerId = id;
    } catch {
      /* ownerId stays optional */
    }
  }

  const street = input.address?.trim();
  const notes = input.notes?.trim();
  const payload = compactBody({
    name: input.name,
    website: asHttpUrl(input.website),
    industry: input.industry,
    phone: isPlaceholder(input.phone ?? "", ["+61 400 000 000"])
      ? undefined
      : input.phone,
    city: input.city,
    annualRevenue: asDecimalMoney(input.annualRevenue),
    ownerId,
    description:
      notes && !/^account context, relationship notes/i.test(notes)
        ? notes
        : undefined,
    size: asCompanySize(input.companySize),
    employeeCount: asEmployeeCount(input.companySize),
    street:
      street && !isPlaceholder(street, ["Street address"])
        ? street
        : undefined,
    state: input.state,
    country: input.country,
  });

  let data: unknown;
  try {
    data = await companiesMutate("", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (!ownerId) throw err;
    const { ownerId: _ignored, ...withoutOwner } = payload;
    void _ignored;
    data = await companiesMutate("", {
      method: "POST",
      body: JSON.stringify(withoutOwner),
    });
  }
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
    ownerId: string;
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
  if (patch.ownerId && isUuid(patch.ownerId)) {
    body.ownerId = patch.ownerId;
  } else if (patch.owner != null) {
    if (isUuid(patch.owner)) body.ownerId = patch.owner;
    else body.ownerName = patch.owner;
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
  const ids = input.ids.filter(isUuid);
  if (!ids.length) return { affected: 0 };
  return companiesMutate("/bulk", {
    method: "POST",
    body: JSON.stringify({ ...input, ids }),
  });
}

export async function pollCrmCompanyTransfer(
  transferId: string,
): Promise<unknown> {
  return getCrmCompanyTransfer(transferId);
}

export async function followCompanyTransfer(data: unknown): Promise<unknown> {
  const id = transferIdFrom(data);
  if (!id) return data;
  let last: unknown = data;
  for (let i = 0; i < 8; i += 1) {
    last = await getCrmCompanyTransfer(id);
    const rec =
      last && typeof last === "object"
        ? (last as Record<string, unknown>)
        : null;
    const status = String(rec?.status ?? rec?.state ?? "").toLowerCase();
    if (
      status.includes("complete") ||
      status.includes("done") ||
      status.includes("fail") ||
      status.includes("error")
    ) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return last;
}

export async function importCrmCompanies(input: {
  rows: Record<string, unknown>[];
}): Promise<unknown> {
  const data = await companiesMutate("/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return followCompanyTransfer(data);
}

export async function exportCrmCompanies(input: {
  ids?: string[];
} = {}): Promise<unknown> {
  const data = await companiesMutate("/export", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return followCompanyTransfer(data);
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
