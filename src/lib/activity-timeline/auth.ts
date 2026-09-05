/**
 * CRM auth + workspace scoping for workspace-prefixed APIs.
 *
 * Live multi-crm-backend requires:
 *   Authorization: Bearer <accessToken with workspaceId claim>
 *   URL workspaceId === JWT workspaceId
 *
 * Token sources (first match wins):
 *   1. sessionStorage / localStorage (`fc.crm.*`)
 *   2. /api/auth/crm-token bridge (FinConnex session cookie)
 *
 * Workspace sources:
 *   1. JWT `workspaceId` claim
 *   2. stored / NEXT_PUBLIC_WORKSPACE_ID
 *   3. GET /v1/workspaces/mine → POST /v1/auth/workspace
 */

import { fetchAuthBridge } from "@/lib/persistence/auth-bridge";

const ACCESS_KEY = "fc.crm.accessToken";
const REFRESH_KEY = "fc.crm.refreshToken";
const WORKSPACE_KEY = "fc.crm.workspaceId";

export type CrmSession = {
  baseUrl: string;
  accessToken: string;
  workspaceId: string;
};

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem(key) ||
      window.localStorage.getItem(key) ||
      null
    );
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function persistCrmTokens(input: {
  accessToken: string;
  refreshToken?: string | null;
  workspaceId?: string | null;
}) {
  writeStorage(ACCESS_KEY, input.accessToken);
  if (input.refreshToken) writeStorage(REFRESH_KEY, input.refreshToken);
  if (input.workspaceId) writeStorage(WORKSPACE_KEY, input.workspaceId);
}

export function clearCrmTokens() {
  if (typeof window === "undefined") return;
  for (const key of [ACCESS_KEY, REFRESH_KEY, WORKSPACE_KEY]) {
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function getCrmApiBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://finconnex.payperless.app";
  return raw.replace(/\/$/, "") || null;
}

function getEnvWorkspaceId(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim() ||
    process.env.CRM_WORKSPACE_ID?.trim();
  return raw || null;
}

/** Decode JWT payload without verifying signature (client-side claim read only). */
export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function workspaceIdFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const id = payload?.workspaceId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function isJwtExpired(token: string, skewMs = 15_000): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp * 1000 <= Date.now() + skewMs;
}

async function fetchServerCrmTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  if (typeof window === "undefined") {
    return {
      accessToken: process.env.CRM_ACCESS_TOKEN?.trim() || null,
      refreshToken: process.env.CRM_REFRESH_TOKEN?.trim() || null,
    };
  }
  try {
    const res = await fetch("/api/auth/crm-token", { credentials: "same-origin" });
    if (!res.ok) return { accessToken: null, refreshToken: null };
    const json = (await res.json()) as {
      accessToken?: string | null;
      refreshToken?: string | null;
    };
    return {
      accessToken:
        typeof json.accessToken === "string" && json.accessToken
          ? json.accessToken
          : null,
      refreshToken:
        typeof json.refreshToken === "string" && json.refreshToken
          ? json.refreshToken
          : null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

async function resolveAccessToken(): Promise<string | null> {
  const stored = readStorage(ACCESS_KEY);
  if (stored && !isJwtExpired(stored)) return stored;

  const server = await fetchServerCrmTokens();
  if (server.accessToken) {
    persistCrmTokens({
      accessToken: server.accessToken,
      refreshToken: server.refreshToken,
    });
    return server.accessToken;
  }

  const bridge = await fetchAuthBridge();
  if (bridge.accessToken) {
    writeStorage(ACCESS_KEY, bridge.accessToken);
    return bridge.accessToken;
  }
  return null;
}

async function refreshAccessToken(baseUrl: string): Promise<string | null> {
  const stored = readStorage(REFRESH_KEY);
  const server = await fetchServerCrmTokens();
  const refreshToken =
    (stored && !isJwtExpired(stored) ? stored : null) ||
    (server.refreshToken && !isJwtExpired(server.refreshToken)
      ? server.refreshToken
      : stored || server.refreshToken);
  if (!refreshToken) return null;
  try {
    const data = await crmFetchJson<{
      accessToken?: string;
      refreshToken?: string;
    }>(baseUrl, "/v1/auth/refresh-token", refreshToken, { method: "POST" });
    if (!data?.accessToken) return null;
    persistCrmTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? refreshToken,
    });
    return data.accessToken;
  } catch {
    return null;
  }
}

type ApiEnvelope<T> = {
  statusCode?: number;
  message?: string;
  data?: T;
};

async function crmFetchJson<T>(
  baseUrl: string,
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: ApiEnvelope<T> | T | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as ApiEnvelope<T> | T;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json
        ? String((json as ApiEnvelope<T>).message)
        : `CRM request failed (${res.status})`;
    throw new Error(msg);
  }

  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiEnvelope<T>).data as T;
  }
  return json as T;
}

async function selectWorkspace(
  baseUrl: string,
  accessToken: string,
  workspaceId: string,
): Promise<string> {
  const data = await crmFetchJson<{ accessToken: string }>(
    baseUrl,
    "/v1/auth/workspace",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    },
  );
  if (!data?.accessToken) {
    throw new Error("Workspace selection did not return an access token");
  }
  persistCrmTokens({ accessToken: data.accessToken, workspaceId });
  return data.accessToken;
}

async function resolveWorkspaceId(
  baseUrl: string,
  accessToken: string,
): Promise<{ workspaceId: string; accessToken: string }> {
  const fromJwt = workspaceIdFromToken(accessToken);
  if (fromJwt) {
    writeStorage(WORKSPACE_KEY, fromJwt);
    return { workspaceId: fromJwt, accessToken };
  }

  const preferred =
    readStorage(WORKSPACE_KEY) || getEnvWorkspaceId() || null;

  if (preferred) {
    const scoped = await selectWorkspace(baseUrl, accessToken, preferred);
    return { workspaceId: preferred, accessToken: scoped };
  }

  const mine = await crmFetchJson<unknown>(
    baseUrl,
    "/v1/workspaces/mine",
    accessToken,
  );
  let first = firstWorkspace(mine);
  if (!first?.id) {
    try {
      const admin = await crmFetchJson<unknown>(
        baseUrl,
        "/v1/admin/workspaces?page=1&limit=50",
        accessToken,
      );
      first = firstWorkspace(admin);
    } catch {
      first = null;
    }
  }
  if (!first?.id) {
    try {
      const created = await crmFetchJson<unknown>(
        baseUrl,
        "/v1/workspaces",
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            name: "FinConnex",
            slug: `workspace-${Date.now().toString(36)}`,
          }),
        },
      );
      first = firstWorkspace(created) ?? idFromUnknown(created);
    } catch {
      first = null;
    }
  }
  if (!first?.id) {
    throw new Error("No workspace available for this user");
  }
  const scoped = await selectWorkspace(baseUrl, accessToken, first.id);
  return { workspaceId: first.id, accessToken: scoped };
}

function idFromUnknown(raw: unknown): { id: string } | null {
  if (raw && typeof raw === "object" && "id" in raw) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id === "string" && id) return { id };
  }
  return null;
}

function firstWorkspace(raw: unknown): { id: string } | null {
  if (Array.isArray(raw)) {
    if (
      raw.length === 2 &&
      Array.isArray(raw[0]) &&
      (typeof raw[1] === "number" || raw[1] == null)
    ) {
      const row = raw[0][0] as { id?: string } | undefined;
      return row?.id ? { id: row.id } : null;
    }
    const row = raw[0] as { id?: string } | undefined;
    return row?.id ? { id: row.id } : null;
  }
  if (raw && typeof raw === "object") {
    const rec = raw as {
      items?: { id?: string }[];
      workspaces?: { id?: string }[];
      id?: string;
    };
    const row = rec.items?.[0] ?? rec.workspaces?.[0];
    if (row?.id) return { id: row.id };
    if (typeof rec.id === "string" && rec.id) return { id: rec.id };
  }
  return null;
}

/**
 * Access token without requiring a workspace claim.
 * Used by platform-admin routes (list workspaces, delete user).
 */
let boundSession: CrmSession | null = null;

/** Test / smoke: pin a CRM session so ensureCrmSession skips storage + workspace select. */
export function bindCrmSession(session: CrmSession | null) {
  boundSession = session;
}

export function isBoundCrmSession(): boolean {
  return boundSession != null;
}

export async function ensureCrmAccess(): Promise<{
  baseUrl: string;
  accessToken: string;
} | null> {
  if (boundSession) {
    return {
      baseUrl: boundSession.baseUrl,
      accessToken: boundSession.accessToken,
    };
  }
  const baseUrl = getCrmApiBaseUrl();
  if (!baseUrl) return null;
  const accessToken = await resolveAccessToken();
  if (!accessToken) return null;
  return { baseUrl, accessToken };
}

/**
 * Ensure we have a workspace-scoped CRM session.
 * Returns null when the CRM base URL or token is unavailable (UI should fall back).
 */
export async function ensureCrmSession(): Promise<CrmSession | null> {
  if (boundSession) return boundSession;

  const baseUrl = getCrmApiBaseUrl();
  if (!baseUrl) return null;

  let rawToken = await resolveAccessToken();
  if (!rawToken || isJwtExpired(rawToken)) {
    rawToken = await refreshAccessToken(baseUrl);
  }
  if (!rawToken) return null;

  try {
    const { workspaceId, accessToken } = await resolveWorkspaceId(
      baseUrl,
      rawToken,
    );
    return { baseUrl, accessToken, workspaceId };
  } catch {
    const rotated = await refreshAccessToken(baseUrl);
    if (!rotated) return null;
    try {
      const { workspaceId, accessToken } = await resolveWorkspaceId(
        baseUrl,
        rotated,
      );
      return { baseUrl, accessToken, workspaceId };
    } catch {
      return null;
    }
  }
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}
