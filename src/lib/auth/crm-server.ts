import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  CRM_ACCESS_COOKIE,
  CRM_ACCESS_FALLBACK_MAX_AGE,
  CRM_REFRESH_COOKIE,
  CRM_TOKEN_REFRESH_SKEW_MS,
  getSessionCookieOptions,
  REMEMBER_MAX_AGE,
  SESSION_MAX_AGE,
} from "@/lib/auth/constants";
import type { SessionPayload } from "@/lib/auth/types";
import { isPlatformAdminRole } from "@/lib/auth/platform";
import { asWorkspaceRole } from "@/lib/auth/workspace-role";

export type CrmUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userName: string;
  avatar: string | null;
  /** Platform tier. `USER` for every self-signup — never the workspace role. */
  globalRole: string;
  isVerified: boolean;
  /**
   * Role in the workspace the CRM access token is scoped to, from
   * `GET /v1/auth/me`. Null until a workspace is selected.
   */
  workspaceRole?: string | null;
  /** The workspace the CRM access token is scoped to, if any. */
  workspaceId?: string | null;
  /** Admin-provisioned account whose first password hasn't been replaced. */
  mustChangePassword?: boolean;
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
    // Stays the platform tier. What someone may do *inside* a workspace is
    // `workspaceRole` — see the note on SessionPayload.
    role: user.globalRole || "USER",
    tenantId: workspace?.id || fromJwt || user.id,
    tenantSlug: workspace?.slug || "workspace",
    tenantName: workspace?.name || "Workspace",
    hasWorkspace: !!(workspace?.id || fromJwt),
    workspaceRole: asWorkspaceRole(user.workspaceRole),
    mustChangePassword: user.mustChangePassword === true,
  };
}

export function applyCrmTokenCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken?: string | null },
  rememberMe = false,
) {
  const base = getSessionCookieOptions(rememberMe);
  // Browsers silently drop Set-Cookie values over ~4KB. Nest access JWTs often
  // exceed that on Vercel, which leaves the FinConnex session cookie intact but
  // strips CRM auth — every email/CRM mutation then fails as "token unavailable".
  const maxCookieBytes = 3500;
  const accessBytes = new TextEncoder().encode(tokens.accessToken).length;
  if (accessBytes > 0 && accessBytes <= maxCookieBytes) {
    response.cookies.set(CRM_ACCESS_COOKIE, tokens.accessToken, {
      ...base,
      maxAge: tokenMaxAgeSeconds(tokens.accessToken, CRM_ACCESS_FALLBACK_MAX_AGE),
    });
  } else {
    response.cookies.set(CRM_ACCESS_COOKIE, "", { ...base, maxAge: 0 });
  }
  if (tokens.refreshToken) {
    const refreshBytes = new TextEncoder().encode(tokens.refreshToken).length;
    if (refreshBytes <= maxCookieBytes) {
      const refreshFallback = rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;
      const refreshAge = tokenMaxAgeSeconds(tokens.refreshToken, refreshFallback);
      response.cookies.set(CRM_REFRESH_COOKIE, tokens.refreshToken, {
        ...base,
        maxAge: rememberMe ? Math.max(refreshAge, REMEMBER_MAX_AGE) : refreshAge,
      });
    }
  }
}

export function clearCrmTokenCookies(response: NextResponse) {
  const cleared = { ...getSessionCookieOptions(false), maxAge: 0 };
  response.cookies.set(CRM_ACCESS_COOKIE, "", cleared);
  response.cookies.set(CRM_REFRESH_COOKIE, "", cleared);
}

export function crmJwtExpiresInSeconds(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  return Math.max(0, exp - Math.floor(Date.now() / 1000));
}

export function isCrmJwtExpired(
  token: string | null | undefined,
  skewMs = CRM_TOKEN_REFRESH_SKEW_MS,
): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp * 1000 <= Date.now() + skewMs;
}

function preferLiveToken(
  cookie: string | undefined,
  env: string | undefined,
): string | null {
  if (cookie && !isCrmJwtExpired(cookie)) return cookie;
  if (env && !isCrmJwtExpired(env)) return env;
  if (cookie) return cookie;
  return null;
}

export async function readCrmTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const store = await cookies();
  return {
    accessToken: preferLiveToken(
      store.get(CRM_ACCESS_COOKIE)?.value,
      process.env.CRM_ACCESS_TOKEN?.trim(),
    ),
    refreshToken: preferLiveToken(
      store.get(CRM_REFRESH_COOKIE)?.value,
      process.env.CRM_REFRESH_TOKEN?.trim(),
    ),
  };
}

/** Cookie/env CRM JWTs, refreshed and workspace-scoped when possible. */
let inflightRotate: Promise<{
  accessToken: string;
  refreshToken: string;
}> | null = null;

export async function resolveLiveCrmAuth(): Promise<{
  accessToken: string;
  refreshToken: string | null;
} | null> {
  return resolveLiveCrmAuthOnce();
}

async function resolveLiveCrmAuthOnce(): Promise<{
  accessToken: string;
  refreshToken: string | null;
} | null> {
  let { accessToken, refreshToken } = await readCrmTokens();

  if ((!accessToken || isCrmJwtExpired(accessToken)) && refreshToken) {
    try {
      const rotated = await refreshCrmTokens(refreshToken);
      accessToken = rotated.accessToken;
      refreshToken = rotated.refreshToken;
    } catch {
      if (!accessToken || isCrmJwtExpired(accessToken, 0)) return null;
    }
  }

  if (!accessToken) return null;

  if (!workspaceIdFromToken(accessToken)) {
    try {
      const scoped = await activateWorkspace(accessToken, refreshToken);
      return {
        accessToken: scoped.accessToken,
        refreshToken: scoped.refreshToken ?? refreshToken,
      };
    } catch {
      return { accessToken, refreshToken };
    }
  }

  return { accessToken, refreshToken };
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

export async function crmSignup(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<void> {
  await crmFetch<unknown>("/auth/signup", {
    method: "POST",
    body: input,
  });
}

/** Activates a freshly signed-up account with the fixed signup code. */
export async function crmVerifySignupOtp(input: {
  email: string;
  otp: string;
}): Promise<void> {
  await crmFetch<unknown>("/auth/signup/verify-otp", {
    method: "POST",
    body: input,
  });
}

/** Re-sends the signup activation code for an unverified account. */
export async function crmResendSignupOtp(email: string): Promise<void> {
  await crmFetch<unknown>("/auth/signup/resend-otp", {
    method: "POST",
    body: { email },
  });
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
  if (inflightRotate) return inflightRotate;
  inflightRotate = (async () => {
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
  })();
  try {
    return await inflightRotate;
  } finally {
    inflightRotate = null;
  }
}

export async function crmMe(accessToken: string, refreshToken?: string | null) {
  return crmFetch<CrmUser>("/auth/me", { accessToken, refreshToken });
}

/**
 * The caller's role in the workspace their access token is scoped to.
 *
 * Null for an unscoped token, a membership that is no longer active, or any
 * transport failure. Used to label and gate UI only — the Nest guards remain
 * the authorization, and re-check the membership on every request.
 */
export async function crmWorkspaceRole(
  accessToken: string,
  refreshToken?: string | null,
): Promise<string | null> {
  try {
    const me = await crmMe(accessToken, refreshToken);
    return asWorkspaceRole(me.data?.workspaceRole);
  } catch {
    return null;
  }
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

/**
 * Replaces the signed-in user's password. The CRM then revokes every session,
 * this one included, so the caller must sign in again.
 */
export async function crmChangePassword(
  accessToken: string,
  refreshToken: string | null | undefined,
  body: { currentPassword: string; newPassword: string; newPasswordConfirmation: string },
) {
  await crmFetch<{ success?: boolean }>("/auth/password/change", {
    method: "POST",
    accessToken,
    refreshToken,
    body,
  });
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
  const workspaces = listed.workspaces;

  // Memberships only. Platform ADMIN must not be auto-dropped into the first
  // tenant from GET /v1/admin/workspaces — they pick a workspace in /platform.

  const jwtRole = decodeJwtPayload(accessToken)?.globalRole;
  const skipAutoSelect = isPlatformAdminRole(
    typeof jwtRole === "string" ? jwtRole : "",
  );

  const envId =
    preferredId?.trim() ||
    (skipAutoSelect
      ? ""
      : process.env.CRM_WORKSPACE_ID?.trim() ||
        process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim() ||
        "");

  const chosen = skipAutoSelect
    ? (workspaces.find((w) => w.id === preferredId?.trim()) ?? null)
    : (workspaces.find((w) => w.id === envId) ?? workspaces[0] ?? null);

  if (!chosen) {
    return { accessToken, refreshToken, workspace: null, workspaces };
  }

  try {
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
  } catch {
    // Login must still succeed if workspace scoping fails (common locally when
    // CRM_WORKSPACE_ID points at a tenant the user cannot select).
    for (const workspace of workspaces) {
      if (workspace.id === chosen.id) continue;
      try {
        const selected = await crmSelectWorkspace(
          workspace.id,
          accessToken,
          refreshToken,
        );
        return {
          accessToken: selected.data.accessToken,
          refreshToken: selected.refreshToken ?? refreshToken,
          workspace,
          workspaces,
        };
      } catch {
        /* try next membership */
      }
    }
    return { accessToken, refreshToken, workspace: null, workspaces };
  }
}
