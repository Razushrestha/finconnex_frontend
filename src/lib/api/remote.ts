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
    wrap(() =>
      httpPost<{ user: SessionPayload }>("/auth/login", input).then((r) => ({
        user: r.user,
      })),
    ),
  logout: () => wrap(async () => {
    await httpPost("/auth/logout");
    return { ok: true as const };
  }),
  me: () => wrap(() => httpGet<SessionPayload>("/auth/me")),
};

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
  pipelines: () => wrap(() => httpGet("/deals/pipelines")),
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
