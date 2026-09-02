import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  ContactCardData,
  ContactSource,
  ContactStatus,
} from "@/lib/contacts/types";

export type CrmContactQuery = {
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

const STATUS_DOT: Record<ContactStatus, string> = {
  Active: "bg-emerald-500",
  Inactive: "bg-slate-400",
  Unsubscribed: "bg-amber-500",
  Bounced: "bg-rose-500",
  Archived: "bg-zinc-400",
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

export function isCrmContactId(id: string): boolean {
  return isUuid(id);
}

export function contactsPath(suffix = ""): string {
  return `/v1/contacts${suffix}`;
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
    const rec = data as {
      items?: unknown;
      contacts?: unknown;
      columns?: unknown;
      groups?: unknown;
    };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.contacts)) return extractRecords(rec.contacts);
    for (const key of ["columns", "groups"] as const) {
      const cols = rec[key];
      if (!Array.isArray(cols)) continue;
      const out: Record<string, unknown>[] = [];
      for (const col of cols) {
        if (col && typeof col === "object") {
          out.push(...extractRecords(col));
        }
      }
      if (out.length) return out;
    }
  }
  return [];
}

export function mapContactStatus(raw: string): ContactStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("unsub")) return "Unsubscribed";
  if (value.includes("bounce")) return "Bounced";
  if (value.includes("archive")) return "Archived";
  if (value.includes("inactive") || value.includes("disabled")) return "Inactive";
  return "Active";
}

export function mapContactSource(raw: string): ContactSource {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("refer")) return "Referral";
  if (value.includes("social")) return "Social Media";
  if (value.includes("email") || value.includes("campaign")) return "Email Campaign";
  if (value.includes("cold") || value.includes("call")) return "Cold Call";
  if (value.includes("web")) return "Website";
  if (value.includes("other")) return "Other";
  return "Website";
}

function apiStatus(status: ContactStatus): string {
  return status.toUpperCase().replace(/ /g, "_");
}

function apiSource(source: ContactSource): string {
  return source.toUpperCase().replace(/ /g, "_");
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function formatCreated(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) {
    return new Date().toLocaleDateString("en-AU");
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-AU");
}

export type NormalizedCrmContact = {
  contact: ContactCardData;
  status: ContactStatus;
};

export function normalizeCrmContact(
  raw: Record<string, unknown>,
  index: number,
): NormalizedCrmContact {
  const owner =
    raw.owner && typeof raw.owner === "object"
      ? (raw.owner as Record<string, unknown>)
      : null;
  const company =
    raw.company && typeof raw.company === "object"
      ? (raw.company as Record<string, unknown>)
      : null;
  const first = pickStr(raw.firstName, raw.givenName);
  const last = pickStr(raw.lastName, raw.familyName);
  const name =
    pickStr(raw.name, raw.fullName, `${first} ${last}`.trim()) || "Untitled contact";
  const status = mapContactStatus(pickStr(raw.status, raw.state, "ACTIVE"));
  const id = pickStr(raw.id, raw.uuid, raw.contactId) || `crm-ct-${index}`;

  return {
    status,
    contact: {
      id,
      name,
      firstName: first || undefined,
      lastName: last || undefined,
      initials: pickStr(raw.initials) || initialsFromName(name),
      company: pickStr(
        company && pickStr(company.name, company.title),
        raw.companyName,
        typeof raw.company === "string" ? raw.company : "",
      ),
      companyId: pickStr(raw.companyId, company && company.id) || undefined,
      email: pickStr(raw.email, raw.emailAddress, raw.primaryEmail),
      phone: pickStr(raw.phone, raw.phoneNumber, raw.primaryPhone),
      mobile: pickStr(raw.mobile, raw.mobilePhone) || undefined,
      owner: pickStr(
        owner && pickStr(owner.name, owner.email),
        raw.ownerName,
        raw.assignedTo,
        typeof raw.owner === "string" ? raw.owner : "",
        "—",
      ),
      ownerId: pickStr(raw.ownerId, owner && owner.id) || undefined,
      jobTitle: pickStr(raw.jobTitle) || undefined,
      department: pickStr(raw.department) || undefined,
      linkedinUrl: pickStr(raw.linkedinUrl) || undefined,
      lifecycleStage: pickStr(raw.lifecycleStage) || undefined,
      doNotContact:
        raw.doNotContact === true ||
        String(raw.doNotContact).toLowerCase() === "true",
      notes: pickStr(raw.notes) || undefined,
      source: mapContactSource(
        pickStr(raw.source, raw.leadSource, raw.origin, "WEBSITE"),
      ),
      createdDate: formatCreated(raw.createdAt ?? raw.createdDate ?? raw.createdOn),
      accentColorClass: STATUS_DOT[status],
      avatarBgClass: AVATAR_COLORS[index % AVATAR_COLORS.length],
    },
  };
}

export function normalizeCrmContacts(data: unknown): NormalizedCrmContact[] {
  return extractRecords(data).map((row, index) =>
    normalizeCrmContact(row, index),
  );
}

async function contactsGet(suffix: string, query = ""): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load contacts");
  return crmFetch(auth, `${contactsPath(suffix)}${query}`);
}

async function contactsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage contacts");
  return crmFetch(auth, contactsPath(suffix), init);
}

export async function listCrmContactBoard(): Promise<NormalizedCrmContact[]> {
  return normalizeCrmContacts(await contactsGet("/board"));
}

export async function listCrmContacts(
  query: CrmContactQuery = {},
): Promise<NormalizedCrmContact[]> {
  return normalizeCrmContacts(
    await contactsGet(
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

/** Prefer Swagger board; fall back to paginated list. */
export async function loadCrmContacts(
  query: CrmContactQuery = {},
): Promise<NormalizedCrmContact[]> {
  try {
    const board = await listCrmContactBoard();
    if (board.length) return board;
  } catch {
    /* list endpoint is the documented fallback */
  }
  return listCrmContacts(query);
}

export async function getCrmContact(
  id: string,
): Promise<NormalizedCrmContact | null> {
  if (!isUuid(id)) return null;
  const data = await contactsGet(`/${id}`);
  const items = normalizeCrmContacts(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCrmContact(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function createCrmContact(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  company?: string;
  companyId?: string;
  source?: ContactSource;
  status: ContactStatus;
  owner: string;
  ownerId?: string;
  jobTitle?: string;
  department?: string;
  linkedinUrl?: string;
  lifecycleStage?: string;
  doNotContact?: boolean;
  notes?: string;
}): Promise<NormalizedCrmContact | null> {
  const body: Record<string, unknown> = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    mobilePhone: input.mobile,
    source: input.source ? apiSource(input.source) : undefined,
    jobTitle: input.jobTitle,
    department: input.department,
    linkedinUrl: input.linkedinUrl,
    lifecycleStage: input.lifecycleStage,
    doNotContact: input.doNotContact,
    notes: input.notes,
  };
  if (input.companyId) body.companyId = input.companyId;
  if (input.ownerId) body.ownerId = input.ownerId;
  const data = await contactsMutate("", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const items = normalizeCrmContacts(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCrmContact(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function updateCrmContact(
  id: string,
  patch: Partial<{
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string;
    mobile: string;
    company: string;
    companyId: string | null;
    source: ContactSource;
    status: ContactStatus;
    owner: string;
    ownerId: string | null;
    jobTitle: string;
    department: string;
    linkedinUrl: string;
    lifecycleStage: string;
    doNotContact: boolean;
    notes: string;
  }>,
): Promise<NormalizedCrmContact | null> {
  if (!isUuid(id)) return null;
  const body: Record<string, unknown> = {};
  if (patch.firstName != null) body.firstName = patch.firstName;
  if (patch.lastName != null) body.lastName = patch.lastName;
  if (patch.name != null) {
    const parts = patch.name.trim().split(/\s+/);
    if (patch.firstName == null) body.firstName = parts[0] ?? patch.name;
    if (patch.lastName == null) body.lastName = parts.slice(1).join(" ");
  }
  if (patch.email != null) body.email = patch.email;
  if (patch.phone != null) body.phone = patch.phone;
  if (patch.mobile != null) body.mobilePhone = patch.mobile;
  if (patch.companyId !== undefined) body.companyId = patch.companyId;
  if (patch.source != null) body.source = apiSource(patch.source);
  if (patch.status != null) body.status = apiStatus(patch.status);
  if (patch.ownerId !== undefined) body.ownerId = patch.ownerId;
  if (patch.jobTitle != null) body.jobTitle = patch.jobTitle;
  if (patch.department != null) body.department = patch.department;
  if (patch.linkedinUrl != null) body.linkedinUrl = patch.linkedinUrl;
  if (patch.lifecycleStage != null) body.lifecycleStage = patch.lifecycleStage;
  if (patch.doNotContact != null) body.doNotContact = patch.doNotContact;
  if (patch.notes != null) body.notes = patch.notes;
  const data = await contactsMutate(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const items = normalizeCrmContacts(data);
  return items[0] ?? null;
}

export async function deleteCrmContact(id: string): Promise<void> {
  if (!isUuid(id)) return;
  await contactsMutate(`/${id}`, { method: "DELETE" });
}

export async function bulkCrmContacts(input: {
  ids: string[];
  operation: string;
  payload?: Record<string, unknown>;
}): Promise<unknown> {
  return contactsMutate("/bulk", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function importCrmContacts(input: {
  rows: Record<string, unknown>[];
}): Promise<unknown> {
  return contactsMutate("/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function mergeCrmContacts(input: {
  survivorId: string;
  sourceId: string;
}): Promise<NormalizedCrmContact | null> {
  const data = await contactsMutate(`/${input.survivorId}/merge`, {
    method: "POST",
    body: JSON.stringify({
      sourceId: input.sourceId,
      sourceContactId: input.sourceId,
      mergeFromId: input.sourceId,
    }),
  });
  const items = normalizeCrmContacts(data);
  return items[0] ?? null;
}

export async function replaceCrmContactTags(
  id: string,
  tags: string[],
): Promise<string[] | null> {
  if (!isUuid(id)) return null;
  const data = await contactsMutate(`/${id}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tags }),
  });
  if (Array.isArray(data)) return data as string[];
  if (data && typeof data === "object") {
    const rec = data as { tags?: unknown; data?: unknown };
    if (Array.isArray(rec.tags)) return rec.tags as string[];
    if (Array.isArray(rec.data)) return rec.data as string[];
  }
  return tags;
}

export async function listCrmContactDeals(
  contactId: string,
  query: { page?: number; limit?: number } = {},
): Promise<unknown> {
  if (!isUuid(contactId)) return [];
  return contactsGet(
    `/${contactId}/deals`,
    toQuery({ page: query.page, limit: query.limit ?? 50 }),
  );
}

export async function listCrmContactTickets(
  contactId: string,
  query: { page?: number; limit?: number } = {},
): Promise<unknown> {
  if (!isUuid(contactId)) return [];
  return contactsGet(
    `/${contactId}/tickets`,
    toQuery({ page: query.page, limit: query.limit ?? 50 }),
  );
}

export async function tryCrmContact<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
