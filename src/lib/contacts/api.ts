import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Nest `GET /contacts/board` returns `{ status, records, total }[]`. */
function looksLikeBoardColumn(rec: Record<string, unknown>): boolean {
  if (Array.isArray(rec.records) || Array.isArray(rec.contacts)) return true;
  const grouped =
    rec.status != null || rec.lifecycleStage != null || rec.key != null;
  return grouped && typeof rec.total === "number" && rec.email == null;
}

function looksLikeContactRecord(rec: Record<string, unknown>): boolean {
  if (looksLikeBoardColumn(rec)) return false;
  return Boolean(
    pickStr(rec.email, rec.emailAddress, rec.primaryEmail) ||
      pickStr(rec.firstName, rec.lastName, rec.name, rec.fullName) ||
      isUuid(pickStr(rec.id, rec.uuid, rec.contactId)),
  );
}

function columnRecords(col: Record<string, unknown>): unknown {
  if (Array.isArray(col.records)) return col.records;
  if (Array.isArray(col.contacts)) return col.contacts;
  if (Array.isArray(col.items)) return col.items;
  return [];
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
    const rows = data.filter(isPlainRecord);
    if (rows.some(looksLikeBoardColumn)) {
      return rows.flatMap((col) => extractRecords(columnRecords(col)));
    }
    return rows.filter(looksLikeContactRecord);
  }
  if (!isPlainRecord(data)) return [];

  if (data.data != null) {
    const nested = extractRecords(data.data);
    if (nested.length) return nested;
  }
  if (Array.isArray(data.items)) return extractRecords(data.items);
  if (Array.isArray(data.contacts)) return extractRecords(data.contacts);
  if (Array.isArray(data.records)) return extractRecords(data.records);
  if (Array.isArray(data.rows)) return extractRecords(data.rows);
  for (const key of ["columns", "groups"] as const) {
    const cols = data[key];
    if (!Array.isArray(cols)) continue;
    const out = extractRecords(cols);
    if (out.length) return out;
  }
  if (looksLikeContactRecord(data)) return [data];
  return [];
}

function unwrapContactPayload(data: unknown): Record<string, unknown> | null {
  let cur: unknown = data;
  for (let i = 0; i < 6; i += 1) {
    if (!isPlainRecord(cur)) break;
    if (looksLikeContactRecord(cur)) return cur;
    if (cur.data != null) {
      cur = cur.data;
      continue;
    }
    break;
  }
  return null;
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
  if (!value) return "";
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
  const name = pickStr(raw.name, raw.fullName, `${first} ${last}`.trim());
  const status = mapContactStatus(pickStr(raw.status, raw.state) || "ACTIVE");
  const id = pickStr(raw.id, raw.uuid, raw.contactId);
  const sourceRaw = pickStr(raw.source, raw.leadSource, raw.origin);

  return {
    status,
    contact: {
      id,
      name: name || [first, last].filter(Boolean).join(" ") || emailFallback(raw),
      firstName: first || undefined,
      lastName: last || undefined,
      initials: pickStr(raw.initials) || initialsFromName(name || first || last || "C"),
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
      source: sourceRaw ? mapContactSource(sourceRaw) : undefined,
      createdDate: formatCreated(raw.createdAt ?? raw.createdDate ?? raw.createdOn),
      accentColorClass: STATUS_DOT[status],
      avatarBgClass: AVATAR_COLORS[index % AVATAR_COLORS.length],
    },
  };
}

function emailFallback(raw: Record<string, unknown>): string {
  return pickStr(raw.email, raw.emailAddress, raw.primaryEmail);
}

export function normalizeCrmContacts(data: unknown): NormalizedCrmContact[] {
  return extractRecords(data)
    .map((row, index) => normalizeCrmContact(row, index))
    .filter((item) => isUuid(item.contact.id));
}

async function contactsCrm<T>(path: string, init?: RequestInit): Promise<T> {
  if (isBoundCrmSession()) {
    const auth = await resolveAuth();
    if (!auth) throw new Error("Sign in to load contacts");
    return crmFetch(auth, path, init);
  }
  return crmBffFetch<T>(path, init);
}

async function contactsGet(suffix: string, query = ""): Promise<unknown> {
  return contactsCrm(`${contactsPath(suffix)}${query}`);
}

async function contactsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  return contactsCrm(contactsPath(suffix), init);
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

function isLiveNormalizedContact(item: NormalizedCrmContact): boolean {
  return isUuid(item.contact.id) || Boolean(item.contact.email);
}

/** Prefer Swagger board; fall back to paginated list. */
export async function loadCrmContacts(
  query: CrmContactQuery = {},
): Promise<NormalizedCrmContact[]> {
  try {
    const board = await listCrmContactBoard().then((rows) =>
      rows.filter(isLiveNormalizedContact),
    );
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
  if (items[0] && isLiveNormalizedContact(items[0])) return items[0];
  const entity = unwrapContactPayload(data);
  if (entity) return normalizeCrmContact(entity, 0);
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
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
  };
  if (input.phone?.trim()) body.phone = input.phone.trim();
  if (input.mobile?.trim()) body.mobilePhone = input.mobile.trim();
  if (input.source) body.source = apiSource(input.source);
  if (input.jobTitle?.trim()) body.jobTitle = input.jobTitle.trim();
  if (input.department?.trim()) body.department = input.department.trim();
  if (input.linkedinUrl?.trim()) body.linkedinUrl = input.linkedinUrl.trim();
  if (input.lifecycleStage?.trim()) body.lifecycleStage = input.lifecycleStage.trim();
  if (input.doNotContact != null) body.doNotContact = input.doNotContact;
  if (input.notes?.trim()) body.notes = input.notes.trim();
  if (input.companyId && isUuid(input.companyId)) body.companyId = input.companyId;
  else if (input.company && isUuid(input.company)) body.companyId = input.company;
  if (input.ownerId && isUuid(input.ownerId)) body.ownerId = input.ownerId;
  const data = await contactsMutate("", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const items = normalizeCrmContacts(data);
  if (items[0] && isLiveNormalizedContact(items[0])) return items[0];
  const entity = unwrapContactPayload(data);
  if (entity) {
    const mapped = normalizeCrmContact(entity, 0);
    if (isLiveNormalizedContact(mapped)) return mapped;
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
