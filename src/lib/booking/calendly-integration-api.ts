/**
 * Calendly connection + Google/Outlook calendar-sync (Swagger Calendly Integration / Calendar Sync).
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";

export type CalendlyConnection = {
  connected: boolean;
  status: string;
  organization?: string;
  user?: string;
  lastSyncedAt?: string;
  raw: Record<string, unknown>;
};

export type CalendlySyncStatus = {
  status: string;
  lastSyncedAt?: string;
  raw: Record<string, unknown>;
};

export type CalendarSyncConnection = {
  id: string;
  provider: string;
  email?: string;
  connected: boolean;
  lastSyncedAt?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickBool(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  const rec = asRecord(data);
  if (!rec) return [];
  for (const key of ["items", "connections", "webhooks", "records", "rows", "result"]) {
    if (Array.isArray(rec[key])) return extractRecords(rec[key]);
  }
  if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  return [rec];
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  };
}

async function crmCall(path: string, init?: RequestInit): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (!scoped?.workspaceId) throw new Error("Sign in to connect Calendly");
  const resolved = path.replaceAll("{workspaceId}", scoped.workspaceId);
  if (isBoundCrmSession()) {
    return (async (session: CrmSession) => crmFetch(session, resolved, init))(scoped);
  }
  return crmBffFetch(resolved, init);
}

export function workspaceCalendlyIntegrationPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/integrations/calendly${suffix}`;
}

function normalizeConnection(data: unknown): CalendlyConnection {
  const rec = asRecord(data) ?? extractRecords(data)[0] ?? {};
  const nested = asRecord(rec.connection) ?? asRecord(rec.organization) ?? rec;
  const status = pickStr(rec.status, nested.status, rec.syncStatus) || "unknown";
  const connected =
    pickBool(rec.connected, rec.isConnected, rec.is_connected, nested.connected) ||
    ["connected", "active", "ok", "healthy", "synced"].includes(
      status.toLowerCase(),
    );
  return {
    connected,
    status: connected ? status || "connected" : status || "disconnected",
    organization: pickStr(
      rec.organizationName,
      rec.organization,
      nested.name,
      rec.account,
    ),
    user: pickStr(rec.userName, rec.user, rec.email, nested.email),
    lastSyncedAt: pickStr(
      rec.lastSyncedAt,
      rec.last_synced_at,
      rec.syncedAt,
      rec.updatedAt,
    ),
    raw: rec,
  };
}

export function getCalendlyConnection(): Promise<CalendlyConnection> {
  return crmCall("/v1/workspaces/{workspaceId}/integrations/calendly")
    .then(normalizeConnection)
    .catch((err) => {
      const message = err instanceof Error ? err.message : "";
      if (/404|not found/i.test(message) || /failed \(404\)/.test(message)) {
        return {
          connected: false,
          status: "disconnected",
          raw: {},
        } satisfies CalendlyConnection;
      }
      throw err;
    });
}

export function getCalendlySyncStatus(): Promise<CalendlySyncStatus> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/sync-status",
  ).then((data) => {
    const rec = asRecord(data) ?? {};
    return {
      status: pickStr(rec.status, rec.state) || "unknown",
      lastSyncedAt: pickStr(rec.lastSyncedAt, rec.last_synced_at),
      raw: rec,
    };
  });
}

function pickRedirectUrl(data: unknown): string {
  const rec = asRecord(data) ?? extractRecords(data)[0] ?? {};
  return pickStr(
    rec.authorizationUrl,
    rec.authorization_url,
    rec.authorizeUrl,
    rec.oauthUrl,
    rec.url,
    rec.redirectUrl,
    rec.redirect_uri,
  );
}

export async function connectCalendly(input?: {
  personalAccessToken?: string;
}): Promise<{ connection: CalendlyConnection; authorizationUrl: string }> {
  if (!input?.personalAccessToken) {
    throw new Error(
      "Calendly OAuth is not configured on the CRM server (reconnect returned unavailable). Paste a Calendly personal access token instead.",
    );
  }

  const token = input.personalAccessToken.trim();
  const bodies: Record<string, string>[] = [
    { personalAccessToken: token },
    { kind: "PAT", personalAccessToken: token },
    { method: "pat", personalAccessToken: token },
    { pat: token },
    { accessToken: token },
    { token },
  ];
  let lastError: unknown;
  for (const body of bodies) {
    try {
      const data = await crmCall(
        "/v1/workspaces/{workspaceId}/integrations/calendly/connect",
        jsonInit("POST", body),
      );
      return {
        connection: normalizeConnection(data),
        authorizationUrl: pickRedirectUrl(data),
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Calendly rejected this personal access token.");
}

export async function startCalendlyOAuth(): Promise<string> {
  try {
    const authorizationUrl = await reconnectCalendly();
    if (authorizationUrl) return authorizationUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/503|not configured|unavailable/i.test(message)) {
      throw new Error(
        "Calendly OAuth is not configured on the CRM server. Paste a personal access token below.",
      );
    }
    throw err instanceof Error
      ? err
      : new Error("Could not start Calendly OAuth.");
  }
  throw new Error(
    "Calendly OAuth is not configured on the CRM server. Paste a personal access token below.",
  );
}

export function reconnectCalendly(): Promise<string> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/reconnect",
    jsonInit("POST", {}),
  ).then(pickRedirectUrl);
}

export function checkCalendlyHealth(): Promise<CalendlyConnection> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/health",
    jsonInit("POST", {}),
  )
    .catch(() =>
      crmCall(
        "/v1/workspaces/{workspaceId}/integrations/calendly/health-check",
        jsonInit("POST", {}),
      ),
    )
    .then(normalizeConnection);
}

export function syncCalendlyCatalog(): Promise<unknown> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/sync",
    jsonInit("POST", {}),
  );
}

export function disconnectCalendly(): Promise<unknown> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/disconnect",
    jsonInit("POST", {}),
  ).catch(() =>
    crmCall("/v1/workspaces/{workspaceId}/integrations/calendly", {
      method: "DELETE",
    }),
  );
}

export function listCalendlyWebhooks(): Promise<Record<string, unknown>[]> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/webhooks",
  ).then(extractRecords);
}

export function registerCalendlyWebhook(): Promise<unknown> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/webhooks",
    jsonInit("POST", {}),
  ).catch(() =>
    crmCall(
      "/v1/workspaces/{workspaceId}/integrations/calendly/webhooks/register",
      jsonInit("POST", {}),
    ),
  );
}

export function refreshCalendlyWebhooks(): Promise<unknown> {
  return crmCall(
    "/v1/workspaces/{workspaceId}/integrations/calendly/webhooks/refresh",
    jsonInit("POST", {}),
  );
}

export function authorizeCalendarSync(
  provider: "google" | "outlook",
): Promise<string> {
  const label = provider === "google" ? "Google" : "Outlook";
  return crmCall(`/v1/calendar-sync/${provider}/authorize`)
    .then((data) => {
      const url = pickRedirectUrl(data);
      if (!url) {
        throw new Error(
          `${label} calendar OAuth is not configured on the CRM server.`,
        );
      }
      return url;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : "";
      if (/503|not configured|service unavailable/i.test(message)) {
        throw new Error(
          `${label} calendar OAuth is not configured on the CRM server.`,
        );
      }
      throw err;
    });
}

export function listCalendarSyncConnections(): Promise<CalendarSyncConnection[]> {
  return crmCall("/v1/calendar-sync/connections").then((data) =>
    extractRecords(data).map((row, index) => ({
      id: pickStr(row.id) || `cal-${index}`,
      provider: pickStr(row.provider, row.kind).toLowerCase(),
      email: pickStr(row.email, row.account),
      connected:
        pickBool(row.connected, row.isConnected) ||
        pickStr(row.status).toLowerCase() !== "disconnected",
      lastSyncedAt: pickStr(row.lastSyncedAt, row.last_synced_at),
    })),
  );
}

export function disconnectCalendarSync(id: string): Promise<unknown> {
  return crmCall(
    `/v1/calendar-sync/connections/${id}/disconnect`,
    jsonInit("POST", {}),
  );
}

export function syncCalendarConnection(id: string): Promise<unknown> {
  return crmCall(
    `/v1/calendar-sync/connections/${id}/sync`,
    jsonInit("POST", {}),
  );
}

export function calendlyOAuthReturnUrl() {
  if (typeof window === "undefined") return "/booking?calendly=connected";
  return `${window.location.origin}/booking?calendly=connected`;
}
