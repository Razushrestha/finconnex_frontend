import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  CRM_ACCESS_COOKIE,
  CRM_REFRESH_COOKIE,
  getSessionCookieOptions,
  REMEMBER_MAX_AGE,
  SESSION_MAX_AGE,
} from "@/lib/auth/constants";
import type { SessionPayload } from "@/lib/auth/types";

export type CrmUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userName: string;
  avatar: string | null;
  globalRole: string;
  isVerified: boolean;
};

export type CrmWorkspace = {
  id: string;
  name: string;
  slug: string;
  status?: string;
  plan?: string;
};

export type CrmAuthSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  ipHash: string;
  userAgent?: string;
  current: boolean;
};

export type CrmLoginResult = {
  user: CrmUser;
  accessToken: string;
  refreshToken: string;
};

type Envelope<T> = {
  statusCode?: number;
  message?: string;
  error?: unknown;
  data?: T;
  timestamp?: string;
};

function crmBaseUrl(): string | null {
  const raw =
    process.env.CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://finconnex.payperless.app";
  return raw.replace(/\/$/, "") || null;
}

export function isCrmAuthEnabled(): boolean {
  return !!crmBaseUrl();
}

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tokenMaxAgeSeconds(token: string, fallback: number): number {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp === "number") {
    return Math.max(30, exp - Math.floor(Date.now() / 1000));
  }
  return fallback;
}

function workspaceIdFromToken(token: string): string | null {
  const id = decodeJwtPayload(token)?.workspaceId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function displayName(user: CrmUser): string {
  const joined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return joined || user.userName || user.email;
}

export function sessionFromCrmUser(
  user: CrmUser,
  workspace?: CrmWorkspace | null,
  accessToken?: string,
): SessionPayload {
  const fromJwt = accessToken ? workspaceIdFromToken(accessToken) : null;
  return {
    userId: user.id,
    email: user.email,
    name: displayName(user),
    role: user.globalRole || "USER",
    tenantId: workspace?.id || fromJwt || user.id,
    tenantSlug: workspace?.slug || "workspace",
    tenantName: workspace?.name || "Workspace",
  };
}

export function applyCrmTokenCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken?: string | null },
  rememberMe = false,
) {
  const base = getSessionCookieOptions(rememberMe);
  response.cookies.set(CRM_ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: tokenMaxAgeSeconds(tokens.accessToken, 15 * 60),
  });
  if (tokens.refreshToken) {
    response.cookies.set(CRM_REFRESH_COOKIE, tokens.refreshToken, {
      ...base,
      maxAge: tokenMaxAgeSeconds(
        tokens.refreshToken,
        rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE,
      ),
    });
  }
}

export function clearCrmTokenCookies(response: NextResponse) {
  const cleared = { ...getSessionCookieOptions(false), maxAge: 0 };
  response.cookies.set(CRM_ACCESS_COOKIE, "", cleared);
  response.cookies.set(CRM_REFRESH_COOKIE, "", cleared);
}

export async function readCrmTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const store = await cookies();
  return {
    accessToken:
      store.get(CRM_ACCESS_COOKIE)?.value ??
      process.env.CRM_ACCESS_TOKEN?.trim() ??
      null,
    refreshToken:
      store.get(CRM_REFRESH_COOKIE)?.value ??
      process.env.CRM_REFRESH_TOKEN?.trim() ??
      null,
  };
}

function envelopeErrorMessage(status: number, body: Envelope<unknown> | null) {
  if (body?.message && typeof body.message === "string") return body.message;
  if (typeof body?.error === "string") return body.error;
  return `CRM auth failed (${status})`;
}

async function parseJson(res: Response): Promise<Envelope<unknown> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Envelope<unknown>;
  } catch {
    return null;
  }
}

function unwrap<T>(body: Envelope<T> | T | null): T | null {
  if (body == null) return null;
  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as Envelope<T>).data ?? null;
  }
  return body as T;
}

type CrmRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
  refreshToken?: string | null;
  /** Use refresh token as Bearer (POST /auth/refresh-token). */
  bearer?: "access" | "refresh";
};

export class CrmAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function crmFetch<T>(
  path: string,
  opts: CrmRequestOptions = {},
): Promise<{ data: T; accessToken: string | null; refreshToken: string | null }> {
  const base = crmBaseUrl();
  if (!base) {
    throw new CrmAuthError(503, "CRM API URL is not configured");
  }

  let accessToken = opts.accessToken ?? null;
  let refreshToken = opts.refreshToken ?? null;
  const method = opts.method ?? "GET";
  const bearerKind = opts.bearer ?? "access";

  const send = async (token: string | null) => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${base}/v1${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  };

  const primary =
    bearerKind === "refresh" ? refreshToken : accessToken;
  let res = await send(primary);
  let body = await parseJson(res);

  if (
    res.status === 401 &&
    bearerKind === "access" &&
    refreshToken &&
    path !== "/auth/refresh-token"
  ) {
    const rotated = await refreshCrmTokens(refreshToken);
    accessToken = rotated.accessToken;
    refreshToken = rotated.refreshToken;
    res = await send(accessToken);
    body = await parseJson(res);
  }

  if (!res.ok) {
    throw new CrmAuthError(res.status, envelopeErrorMessage(res.status, body));
  }

  const data = unwrap<T>(body as Envelope<T>);
  if (data == null && res.status !== 204) {
    if (res.status >= 200 && res.status < 300) {
      return { data: {} as T, accessToken, refreshToken };
    }
    throw new CrmAuthError(502, "CRM returned an empty response");
  }

  return { data: data as T, accessToken, refreshToken };
}

export async function crmForgotPassword(email: string): Promise<void> {
  await crmFetch<unknown>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function crmResetPassword(input: {
  token: string;
  password: string;
  confirmPassword?: string;
}): Promise<void> {
  await crmFetch<unknown>("/auth/reset-password", {
    method: "POST",
    body: {
      token: input.token,
      password: input.password,
      confirmPassword: input.confirmPassword ?? input.password,
    },
  });
}

export async function crmResendEmailVerification(email: string): Promise<void> {
  await crmFetch<unknown>("/auth/email-verification/resend", {
    method: "POST",
    body: { email },
  });
}

export async function crmVerifyEmail(token: string): Promise<void> {
  await crmFetch<unknown>("/auth/email-verification/verify", {
    method: "POST",
    body: { token },
  });
}

export async function crmLogin(
  email: string,
  password: string,
): Promise<CrmLoginResult> {
  const { data } = await crmFetch<CrmLoginResult>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!data?.accessToken || !data?.refreshToken || !data?.user) {
    throw new CrmAuthError(502, "CRM login response was incomplete");
  }
  return data;
}

export async function refreshCrmTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { data } = await crmFetch<{
    accessToken: string;
    refreshToken: string;
  }>("/auth/refresh-token", {
    method: "POST",
    refreshToken,
    bearer: "refresh",
  });
  if (!data?.accessToken || !data?.refreshToken) {
    throw new CrmAuthError(401, "Could not refresh CRM session");
  }
  return data;
}

export async function crmMe(accessToken: string, refreshToken?: string | null) {
  return crmFetch<CrmUser>("/auth/me", { accessToken, refreshToken });
}

export async function crmLogout(
  accessToken: string,
  refreshToken?: string | null,
) {
  try {
    await crmFetch<{ success?: boolean }>("/auth/logout", {
      method: "POST",
      accessToken,
      refreshToken,
    });
  } catch {
    /* still clear local cookies */
  }
}

export async function crmLogoutAll(
  accessToken: string,
  refreshToken?: string | null,
) {
  await crmFetch<{ success?: boolean }>("/auth/logout-all", {
    method: "POST",
    accessToken,
    refreshToken,
  });
}

export async function crmListSessions(
  accessToken: string,
  refreshToken?: string | null,
) {
  const { data, accessToken: nextAccess, refreshToken: nextRefresh } =
    await crmFetch<{ sessions: CrmAuthSession[] }>("/auth/sessions", {
      accessToken,
      refreshToken,
    });
  return {
    sessions: data?.sessions ?? [],
    accessToken: nextAccess,
    refreshToken: nextRefresh,
  };
}

export async function crmRevokeSession(
  sessionId: string,
  accessToken: string,
  refreshToken?: string | null,
) {
  return crmFetch<{ success?: boolean }>(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
    accessToken,
    refreshToken,
  });
}

export async function crmSelectWorkspace(
  workspaceId: string,
  accessToken: string,
  refreshToken?: string | null,
) {
  const result = await crmFetch<{ accessToken: string }>("/auth/workspace", {
    method: "POST",
    body: { workspaceId },
    accessToken,
    refreshToken,
  });
  if (!result.data?.accessToken) {
    throw new CrmAuthError(502, "Workspace selection did not return a token");
  }
  return result;
}

function asWorkspaceList(raw: unknown): CrmWorkspace[] {
  if (Array.isArray(raw)) {
    if (
      raw.length === 2 &&
      Array.isArray(raw[0]) &&
      (typeof raw[1] === "number" || raw[1] == null)
    ) {
      return raw[0] as CrmWorkspace[];
    }
    return raw as CrmWorkspace[];
  }
  if (raw && typeof raw === "object") {
    const rec = raw as { items?: CrmWorkspace[]; workspaces?: CrmWorkspace[] };
    if (Array.isArray(rec.items)) return rec.items;
    if (Array.isArray(rec.workspaces)) return rec.workspaces;
  }
  return [];
}

export async function crmListMyWorkspaces(
  accessToken: string,
  refreshToken?: string | null,
) {
  const result = await crmFetch<CrmWorkspace[] | { items?: CrmWorkspace[] }>(
    "/workspaces/mine",
    { accessToken, refreshToken },
  );
  return { ...result, workspaces: asWorkspaceList(result.data) };
}

export async function crmCreateWorkspace(
  accessToken: string,
  refreshToken?: string | null,
  input: { name?: string; slug?: string } = {},
) {
  const slug =
    input.slug?.trim() ||
    `workspace-${Date.now().toString(36)}`;
  const result = await crmFetch<CrmWorkspace>("/workspaces", {
    method: "POST",
    body: {
      name: input.name?.trim() || "FinConnex",
      slug,
    },
    accessToken,
    refreshToken,
  });
  const created = result.data;
  if (!created?.id) {
    throw new CrmAuthError(502, "Workspace create did not return an id");
  }
  return { ...result, workspace: created };
}

export async function crmListAdminWorkspaces(
  accessToken: string,
  refreshToken?: string | null,
) {
  const result = await crmFetch<unknown>("/admin/workspaces?page=1&limit=50", {
    accessToken,
    refreshToken,
  });
  return { ...result, workspaces: asWorkspaceList(result.data) };
}

export async function activateWorkspace(
  accessToken: string,
  refreshToken: string | null,
  preferredId?: string | null,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  workspace: CrmWorkspace | null;
  workspaces: CrmWorkspace[];
}> {
  const listed = await crmListMyWorkspaces(accessToken, refreshToken);
  accessToken = listed.accessToken ?? accessToken;
  refreshToken = listed.refreshToken ?? refreshToken;
  let workspaces = listed.workspaces;

  if (!workspaces.length) {
    try {
      const admin = await crmListAdminWorkspaces(accessToken, refreshToken);
      accessToken = admin.accessToken ?? accessToken;
      refreshToken = admin.refreshToken ?? refreshToken;
      workspaces = admin.workspaces;
    } catch {
      /* non-admin or route unavailable */
    }
  }

  if (!workspaces.length) {
    try {
      const created = await crmCreateWorkspace(accessToken, refreshToken);
      accessToken = created.accessToken ?? accessToken;
      refreshToken = created.refreshToken ?? refreshToken;
      workspaces = [created.workspace];
    } catch {
      /* create route unavailable */
    }
  }

  const envId =
    preferredId?.trim() ||
    process.env.CRM_WORKSPACE_ID?.trim() ||
    process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim() ||
    "";

  const chosen =
    workspaces.find((w) => w.id === envId) ?? workspaces[0] ?? null;

  if (!chosen) {
    return { accessToken, refreshToken, workspace: null, workspaces };
  }

  const selected = await crmSelectWorkspace(
    chosen.id,
    accessToken,
    refreshToken,
  );
  return {
    accessToken: selected.data.accessToken,
    refreshToken: selected.refreshToken ?? refreshToken,
    workspace: chosen,
    workspaces,
  };
}
