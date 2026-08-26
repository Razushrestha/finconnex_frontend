import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  ClientPortal,
  PortalAccessLevel,
  PortalModule,
  PortalStatus,
} from "@/lib/portals/types";

export type CrmPortalQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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
    const rec = data as { items?: unknown; portals?: unknown };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.portals)) return extractRecords(rec.portals);
  }
  return [];
}

function mapStatus(raw: string): PortalStatus {
  const value = raw.toLowerCase();
  if (value.includes("suspend")) return "Suspended";
  if (value.includes("inactive") || value.includes("disabled")) return "Inactive";
  return "Active";
}

function mapAccess(raw: string): PortalAccessLevel {
  const value = raw.toLowerCase();
  if (value.includes("read")) return "Read-only";
  if (value.includes("limit")) return "Limited";
  return "Full";
}

function mapModules(raw: unknown): PortalModule[] {
  if (!Array.isArray(raw)) return ["Documents", "Tickets"];
  const out: PortalModule[] = [];
  for (const entry of raw) {
    const label = pickStr(entry, typeof entry === "object" && entry
      ? (entry as Record<string, unknown>).name
      : "");
    const normalized = label.toLowerCase();
    if (normalized.includes("deal")) out.push("Deals");
    else if (normalized.includes("doc")) out.push("Documents");
    else if (normalized.includes("task")) out.push("Tasks");
    else if (normalized.includes("ticket")) out.push("Tickets");
    else if (normalized.includes("invoice")) out.push("Invoices");
    else if (normalized.includes("report")) out.push("Reports");
  }
  return out.length ? [...new Set(out)] : ["Documents", "Tickets"];
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
  const client =
    raw.client && typeof raw.client === "object"
      ? (raw.client as Record<string, unknown>)
      : null;

  return {
    id,
    portalId: pickStr(raw.portalCode, raw.code, raw.portalId, id),
    name,
    clientId: pickStr(raw.clientId, client && client.id, "crm-client"),
    clientName: pickStr(
      raw.clientName,
      client && pickStr(client.name, client.title),
      "Client",
    ),
    slug: pickStr(raw.slug, raw.urlSlug, name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `portal-${index}`,
    status: mapStatus(pickStr(raw.status, raw.state, "ACTIVE")),
    accessLevel: mapAccess(pickStr(raw.accessLevel, raw.access, "FULL")),
    modules: mapModules(raw.modules ?? raw.allowedModules),
    primaryContactName: pickStr(
      raw.primaryContactName,
      contact && pickStr(contact.name),
      "Contact",
    ),
    primaryContactEmail: pickStr(
      raw.primaryContactEmail,
      contact && pickStr(contact.email),
      "contact@example.com",
    ),
    inviteSentAt: pickStr(raw.inviteSentAt) || undefined,
    lastLoginAt: pickStr(raw.lastLoginAt) || undefined,
    createdBy: pickStr(raw.createdByName, raw.createdBy, "—"),
    createdAt: pickStr(raw.createdAt, ""),
    activity: [],
    audit: [],
  };
}

export function normalizeClientPortals(data: unknown): ClientPortal[] {
  return extractRecords(data).map((row, index) =>
    normalizeClientPortal(row, index),
  );
}

async function portalsGet(suffix: string, query = ""): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load client portals");
  return crmFetch(auth, `${clientPortalsPath(suffix)}${query}`);
}

async function portalsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage client portals");
  return crmFetch(auth, clientPortalsPath(suffix), init);
}

export async function listCrmClientPortals(
  query: CrmPortalQuery = {},
): Promise<ClientPortal[]> {
  return normalizeClientPortals(
    await portalsGet(
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

export async function getCrmClientPortal(id: string): Promise<ClientPortal | null> {
  const data = await portalsGet(`/${id}`);
  const items = normalizeClientPortals(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeClientPortal(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function createCrmClientPortal(
  body: Record<string, unknown>,
): Promise<ClientPortal | null> {
  const data = await portalsMutate("", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const items = normalizeClientPortals(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeClientPortal(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function updateCrmClientPortal(
  id: string,
  patch: Record<string, unknown>,
): Promise<ClientPortal | null> {
  const data = await portalsMutate(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const items = normalizeClientPortals(data);
  return items[0] ?? null;
}

export async function deleteCrmClientPortal(id: string): Promise<void> {
  await portalsMutate(`/${id}`, { method: "DELETE" });
}

export async function resetCrmClientPortalPassword(
  id: string,
): Promise<ClientPortal | null> {
  const data = await portalsMutate(`/${id}/reset-password`, {
    method: "POST",
    body: "{}",
  });
  const items = normalizeClientPortals(data);
  return items[0] ?? null;
}

export async function tryCrmPortal<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
