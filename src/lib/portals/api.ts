/**
 * Native client-portals APIs (`GET/POST /v1/client-portals`, PATCH/DELETE,
 * POST /:id/reset-password). Bodies match CreatePortalDto / UpdatePortalDto.
 */

import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type {
  ClientPortal,
  PortalAccessLevel,
  PortalModule,
  PortalStatus,
} from "@/lib/portals/types";
import { PORTAL_MODULES, slugifyPortalName } from "@/lib/portals/types";

export type CrmPortalQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  companyId?: string;
};

export type CreateCrmPortalInput = {
  name: string;
  companyId: string;
  primaryContactId: string;
  accessLevel?: PortalAccessLevel;
  modules?: PortalModule[];
};

export type UpdateCrmPortalInput = {
  name?: string;
  status?: PortalStatus;
  accessLevel?: PortalAccessLevel;
  primaryContactId?: string;
  modules?: PortalModule[];
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

export function clientPortalsPath(suffix = ""): string {
  return `/v1/client-portals${suffix}`;
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
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "portals", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

function mapStatus(raw: string): PortalStatus {
  const value = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (value.includes("suspend")) return "Suspended";
  if (value.includes("inactive") || value.includes("disabled")) return "Inactive";
  return "Active";
}

function mapAccess(raw: string): PortalAccessLevel {
  const value = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (value.includes("read")) return "Read-only";
  if (value.includes("limit")) return "Limited";
  return "Full";
}

function mapModules(raw: unknown): PortalModule[] {
  if (!Array.isArray(raw)) return ["Documents", "Tickets"];
  const allowed = new Set<string>(PORTAL_MODULES);
  const out: PortalModule[] = [];
  for (const entry of raw) {
    const label = pickStr(
      entry,
      typeof entry === "object" && entry
        ? (entry as Record<string, unknown>).name
        : "",
    );
    if (allowed.has(label)) out.push(label as PortalModule);
  }
  return out.length ? [...new Set(out)] : ["Documents", "Tickets"];
}

export function apiPortalStatus(status: PortalStatus): "ACTIVE" | "INACTIVE" | "SUSPENDED" {
  if (status === "Inactive") return "INACTIVE";
  if (status === "Suspended") return "SUSPENDED";
  return "ACTIVE";
}

export function apiPortalAccess(
  access: PortalAccessLevel,
): "FULL" | "LIMITED" | "READ_ONLY" {
  if (access === "Read-only") return "READ_ONLY";
  if (access === "Limited") return "LIMITED";
  return "FULL";
}

export function toCreatePortalBody(input: CreateCrmPortalInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    companyId: input.companyId,
    primaryContactId: input.primaryContactId,
  };
  if (input.accessLevel) body.accessLevel = apiPortalAccess(input.accessLevel);
  if (input.modules?.length) body.allowedModules = input.modules;
  return body;
}

export function toUpdatePortalBody(input: UpdateCrmPortalInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name?.trim()) body.name = input.name.trim();
  if (input.status) body.status = apiPortalStatus(input.status);
  if (input.accessLevel) body.accessLevel = apiPortalAccess(input.accessLevel);
  if (input.primaryContactId && isUuid(input.primaryContactId)) {
    body.primaryContactId = input.primaryContactId;
  }
  if (input.modules?.length) body.allowedModules = input.modules;
  return body;
}

function slugFromPortalUrl(portalUrl: string, name: string, index: number) {
  const fromUrl = portalUrl
    .split("/")
    .filter(Boolean)
    .pop();
  if (fromUrl && isUuid(fromUrl)) return slugifyPortalName(name) || `portal-${index}`;
  return slugifyPortalName(fromUrl || name) || `portal-${index}`;
}

export function normalizeClientPortal(
  raw: Record<string, unknown>,
  index: number,
): ClientPortal {
  const id = pickStr(raw.id, raw.uuid, raw.portalId) || `crm-portal-${index}`;
  const name = pickStr(raw.name, raw.title, "Untitled portal");
  const contact =
    raw.primaryContact && typeof raw.primaryContact === "object"
      ? (raw.primaryContact as Record<string, unknown>)
      : null;
  const company =
    raw.company && typeof raw.company === "object"
      ? (raw.company as Record<string, unknown>)
      : raw.client && typeof raw.client === "object"
        ? (raw.client as Record<string, unknown>)
        : null;
  const portalUrl = pickStr(raw.portalUrl, raw.portal_url, raw.url);
  const companyId = pickStr(raw.companyId, raw.clientId, company && company.id);
  const contactId = pickStr(
    raw.primaryContactId,
    contact && contact.id,
  );

  return {
    id,
    portalId: pickStr(raw.portalCode, raw.code, id),
    name,
    clientId: companyId || "crm-client",
    clientName: pickStr(
      raw.clientName,
      company && pickStr(company.name, company.title),
      "Client",
    ),
    slug: pickStr(raw.slug, raw.urlSlug) || slugFromPortalUrl(portalUrl, name, index),
    status: mapStatus(pickStr(raw.status, raw.state, "ACTIVE")),
    accessLevel: mapAccess(pickStr(raw.accessLevel, raw.access, "FULL")),
    modules: mapModules(raw.allowedModules ?? raw.modules),
    primaryContactName: pickStr(
      raw.primaryContactName,
      contact && pickStr(contact.name, contact.firstName),
      "Contact",
    ),
    primaryContactEmail: pickStr(
      raw.primaryContactEmail,
      contact && pickStr(contact.email),
    ),
    primaryContactId: isUuid(contactId) ? contactId : undefined,
    portalUrl: portalUrl || undefined,
    lastLoginAt: pickStr(raw.lastAccessedAt, raw.lastLoginAt) || undefined,
    createdBy: pickStr(raw.createdByName, raw.createdBy, "—"),
    createdAt: pickStr(raw.createdAt, ""),
    activity: [],
    audit: [],
  };
}

export function normalizeClientPortals(data: unknown): ClientPortal[] {
  const rows = extractRecords(data);
  if (
    rows.length === 0 &&
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    pickStr((data as Record<string, unknown>).id, (data as Record<string, unknown>).name)
  ) {
    return [normalizeClientPortal(data as Record<string, unknown>, 0)];
  }
  return rows.map((row, index) => normalizeClientPortal(row, index));
}

async function portalsCall(suffix: string, init?: RequestInit): Promise<unknown> {
  const path = clientPortalsPath(suffix);
  if (isBoundCrmSession()) {
    const scoped = await ensureCrmSession();
    const access = scoped ?? (await ensureCrmAccess());
    if (!access) throw new Error("Sign in to manage client portals");
    return crmFetch(access as CrmSession, path, init);
  }
  return crmBffFetch(path, init);
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  };
}

function asPortal(data: unknown): ClientPortal | null {
  const items = normalizeClientPortals(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    if (pickStr(rec.id, rec.name, rec.portalUrl)) {
      return normalizeClientPortal(rec, 0);
    }
  }
  return null;
}

export async function listCrmClientPortals(
  query: CrmPortalQuery = {},
): Promise<ClientPortal[]> {
  const limit = Math.min(100, Math.max(1, query.limit ?? 100));
  const startPage = query.page != null ? Math.max(1, query.page) : 1;
  const maxPages = query.page != null ? 1 : 20;
  const all: ClientPortal[] = [];
  for (let i = 0; i < maxPages; i += 1) {
    const batch = normalizeClientPortals(
      await portalsCall(
        toQuery({
          page: startPage + i,
          limit,
          search: query.search,
          status: query.status ? apiPortalStatus(query.status as PortalStatus) : undefined,
          companyId: query.companyId && isUuid(query.companyId) ? query.companyId : undefined,
        }),
      ),
    );
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

export async function getCrmClientPortal(id: string): Promise<ClientPortal | null> {
  if (!isUuid(id)) return null;
  return asPortal(await portalsCall(`/${id}`));
}

export async function createCrmClientPortal(
  input: CreateCrmPortalInput | Record<string, unknown>,
): Promise<ClientPortal | null> {
  const typed = input as CreateCrmPortalInput;
  const body =
    typeof typed.companyId === "string" && typeof typed.primaryContactId === "string"
      ? toCreatePortalBody(typed)
      : input;
  return asPortal(await portalsCall("", jsonInit("POST", body)));
}

export async function updateCrmClientPortal(
  id: string,
  patch: UpdateCrmPortalInput | Record<string, unknown>,
): Promise<ClientPortal | null> {
  if (!isUuid(id)) return null;
  const typed = patch as UpdateCrmPortalInput;
  const body =
    typed.modules || typed.status || typed.accessLevel || typed.primaryContactId || typed.name
      ? toUpdatePortalBody(typed)
      : patch;
  return asPortal(await portalsCall(`/${id}`, jsonInit("PATCH", body)));
}

export async function deleteCrmClientPortal(id: string): Promise<void> {
  if (!isUuid(id)) return;
  await portalsCall(`/${id}`, { method: "DELETE" });
}

export async function resetCrmClientPortalPassword(
  id: string,
): Promise<unknown> {
  if (!isUuid(id)) return null;
  return portalsCall(`/${id}/reset-password`, jsonInit("POST", {}));
}

export async function tryCrmPortal<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
