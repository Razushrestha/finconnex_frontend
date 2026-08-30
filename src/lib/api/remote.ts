/**
 * Remote HTTP API: calls backend at NEXT_PUBLIC_API_BASE_URL/v1/*
 * Returns ApiResult; never throws to callers (except programmer errors).
 */

import type {
  AuthApi,
  ContactsApi,
  DealsApi,
  FinconnexApi,
  LeadsApi,
  RulesApi,
  TasksApi,
  TicketsApi,
} from "@/lib/api/contracts";
import { apiFail, apiOk, toApiError } from "@/lib/api/errors";
import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
} from "@/lib/api/http";
import type { Page } from "@/lib/api/types";
import type { AuditEvent } from "@/lib/rules";
import type { SessionPayload } from "@/lib/auth/types";

async function wrap<T>(fn: () => Promise<T>) {
  try {
    return apiOk(await fn());
  } catch (e) {
    return apiFail(toApiError(e));
  }
}

const auth: AuthApi = {
  login: (input) =>
    wrap(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: { id: string; email: string; name: string; role: string };
        tenant?: { id: string; slug: string; name: string };
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Login failed");
      }
      if (!data.user || !data.tenant) {
        const me = await auth.me();
        if (!me.ok) throw new Error(me.error.message);
        return { user: me.data };
      }
      const session: SessionPayload = {
        userId: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        tenantId: data.tenant.id,
        tenantSlug: data.tenant.slug,
        tenantName: data.tenant.name,
      };
      return { user: session };
    }),
  logout: () =>
    wrap(async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      return { ok: true as const };
    }),
  logoutAll: () =>
    wrap(async () => {
      const res = await fetch("/api/auth/logout-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout all failed");
      return { ok: true as const };
    }),
  me: () => wrap(() => localMe()),
  listSessions: () =>
    wrap(async () => {
      const res = await fetch("/api/auth/sessions", { credentials: "include" });
      const data = (await res.json()) as { sessions?: never[] };
      if (!res.ok) throw new Error("Could not list sessions");
      return { sessions: data.sessions ?? [] };
    }),
  revokeSession: (id) =>
    wrap(async () => {
      const res = await fetch(`/api/auth/sessions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not revoke session");
      return { ok: true as const };
    }),
  selectWorkspace: (workspaceId) =>
    wrap(async () => {
      const res = await fetch("/api/auth/workspace", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error("Could not select workspace");
      return { workspaceId };
    }),
  forgotPassword: (email) =>
    wrap(async () => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Could not request password reset");
      return { ok: true as const };
    }),
  resetPassword: (input) =>
    wrap(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: input.token,
          password: input.password,
          confirmPassword: input.password,
        }),
      });
      if (!res.ok) throw new Error("Could not reset password");
      return { ok: true as const };
    }),
  resendEmailVerification: (email) =>
    wrap(async () => {
      const res = await fetch("/api/auth/email-verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Could not resend verification");
      return { ok: true as const };
    }),
  verifyEmail: (token) =>
    wrap(async () => {
      const res = await fetch("/api/auth/email-verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Could not verify email");
      return { ok: true as const };
    }),
};

async function localMe(): Promise<SessionPayload> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  const data = (await res.json()) as {
    user: { id: string; email: string; name: string; role: string };
    tenant: { id: string; slug: string; name: string };
  };
  return {
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    tenantId: data.tenant.id,
    tenantSlug: data.tenant.slug,
    tenantName: data.tenant.name,
  };
}

const leads: LeadsApi = {
  board: () => wrap(() => httpGet("/leads/board")),
  list: (params) =>
    wrap(() =>
      httpGet("/leads", {
        page: params?.page,
        pageSize: params?.pageSize,
        search: params?.search,
        sort: params?.sort,
        order: params?.order,
      }),
    ),
  get: (id) => wrap(() => httpGet(`/leads/${id}`)),
  create: (input) => wrap(() => httpPost("/leads", input)),
  update: (id, patch) => wrap(() => httpPatch(`/leads/${id}`, patch)),
  setStatus: (id, input) =>
    wrap(() => httpPost(`/leads/${id}/status`, input)),
  remove: (id) => wrap(() => httpDelete(`/leads/${id}`)),
};

const contacts: ContactsApi = {
  board: () => wrap(() => httpGet("/contacts/board")),
  list: (params) =>
    wrap(() =>
      httpGet("/contacts", {
        page: params?.page,
        pageSize: params?.pageSize,
        search: params?.search,
      }),
    ),
  get: (id) => wrap(() => httpGet(`/contacts/${id}`)),
  create: (input) => wrap(() => httpPost("/contacts", input)),
  update: (id, patch) => wrap(() => httpPatch(`/contacts/${id}`, patch)),
  remove: (id) => wrap(() => httpDelete(`/contacts/${id}`)),
};

const deals: DealsApi = {
  pipelines: () => wrap(() => httpGet("/deals/pipeline")),
  list: (params) =>
    wrap(() =>
      httpGet("/deals", {
        page: params?.page,
        pageSize: params?.pageSize,
        search: params?.search,
        pipeline: params?.pipeline,
      }),
    ),
  get: (id) => wrap(() => httpGet(`/deals/${id}`)),
  create: (input) => wrap(() => httpPost("/deals", input)),
  setStage: (id, input) => wrap(() => httpPost(`/deals/${id}/stage`, input)),
  remove: (id) => wrap(() => httpDelete(`/deals/${id}`)),
};

const tasks: TasksApi = {
  board: () => wrap(() => httpGet("/tasks/board")),
  list: (params) =>
    wrap(() =>
      httpGet("/tasks", {
        page: params?.page,
        pageSize: params?.pageSize,
        search: params?.search,
      }),
    ),
  get: (id) => wrap(() => httpGet(`/tasks/${id}`)),
  create: (input) => wrap(() => httpPost("/tasks", input)),
  update: (id, patch) => wrap(() => httpPatch(`/tasks/${id}`, patch)),
  remove: (id) => wrap(() => httpDelete(`/tasks/${id}`)),
};

const tickets: TicketsApi = {
  list: (params) =>
    wrap(() =>
      httpGet("/tickets", {
        page: params?.page,
        pageSize: params?.pageSize,
        search: params?.search,
      }),
    ),
  get: (id) => wrap(() => httpGet(`/tickets/${id}`)),
  create: (input) => wrap(() => httpPost("/tickets", input)),
  update: (id, patch) => wrap(() => httpPatch(`/tickets/${id}`, patch)),
  setStatus: (id, input) =>
    wrap(() => httpPost(`/tickets/${id}/status`, input)),
  remove: (id) => wrap(() => httpDelete(`/tickets/${id}`)),
};

const rules: RulesApi = {
  listAudit: (params) =>
    wrap(() =>
      httpGet<Page<AuditEvent>>("/rules/audit", {
        page: params?.page,
        pageSize: params?.pageSize,
      }),
    ),
  listRecycleBin: () => wrap(() => httpGet("/rules/recycle-bin")),
  restore: (id) =>
    wrap(() => httpPost(`/rules/recycle-bin/${id}/restore`)),
  purge: (id) => wrap(() => httpDelete(`/rules/recycle-bin/${id}`)),
  myPermissions: () => wrap(() => httpGet("/rules/permissions/me")),
};

export function createRemoteApi(): FinconnexApi {
  return {
    mode: "remote",
    auth,
    leads,
    contacts,
    deals,
    tasks,
    tickets,
    rules,
  };
}
