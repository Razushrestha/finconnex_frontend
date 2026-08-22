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
  const raw = process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim();
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

async function resolveAccessToken(): Promise<string | null> {
  const stored = readStorage(ACCESS_KEY);
  if (stored) return stored;

  const bridge = await fetchAuthBridge();
  if (bridge.accessToken) {
    writeStorage(ACCESS_KEY, bridge.accessToken);
    return bridge.accessToken;
  }
  return null;
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

  const mine = await crmFetchJson<Array<{ id: string }>>(
    baseUrl,
    "/v1/workspaces/mine",
    accessToken,
  );
  const first = Array.isArray(mine) ? mine[0] : null;
  if (!first?.id) {
    throw new Error("No workspace available for this user");
  }
  const scoped = await selectWorkspace(baseUrl, accessToken, first.id);
  return { workspaceId: first.id, accessToken: scoped };
}

/**
 * Ensure we have a workspace-scoped CRM session.
 * Returns null when the CRM base URL or token is unavailable (UI should fall back).
 */
export async function ensureCrmSession(): Promise<CrmSession | null> {
  const baseUrl = getCrmApiBaseUrl();
  if (!baseUrl) return null;

  const rawToken = await resolveAccessToken();
  if (!rawToken) return null;

  try {
    const { workspaceId, accessToken } = await resolveWorkspaceId(
      baseUrl,
      rawToken,
    );
    return { baseUrl, accessToken, workspaceId };
  } catch {
    return null;
  }
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}
