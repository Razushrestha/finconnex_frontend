import {
  decodeJwtPayload,
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import {
  crmLeadPipelineStage,
  kanbanColumnsToBoard,
  mapCrmLeadToCard,
  parseEstimatedValue,
  pipelineStageToCrmStatus,
  toCrmCreateBody,
  uiDealStageToCrm,
  uiPipelineStageToCrm,
} from "@/lib/leads/api/map";
import type {
  CrmBulkResult,
  CrmCreateLeadInput,
  CrmImportResult,
  CrmLead,
  CrmLeadKanbanColumn,
  CrmLeadSource,
  CrmLeadStatus,
} from "@/lib/leads/api/types";
import { mergeRemoteLeadColumns, saveLeadColumns, upsertLeadFromCard } from "@/lib/leads/store";
import { emitRulesChange } from "@/lib/rules/storage";
import type { LeadCardData, LeadSource } from "@/lib/leads/types";
import { uiSourceToCrm, uiStatusToCrm } from "@/lib/leads/api/map";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";

type Envelope<T> = {
  statusCode?: number;
  message?: string | string[];
  data?: T;
};

class CrmLeadHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function compactBody(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

function crmErrorMessage(json: unknown, status: number): string {
  const raw =
    json && typeof json === "object" && "message" in json
      ? (json as Envelope<unknown>).message
      : undefined;
  const text = Array.isArray(raw)
    ? raw.map(String).filter(Boolean).join("; ")
    : raw != null
      ? String(raw)
      : "";
  const key = text.trim();
  if (
    status === 409 ||
    /unique|duplicate|already exists|emailExists/i.test(key)
  ) {
    return "A lead with this email already exists in the CRM.";
  }
  if (status === 401 || status === 403) {
    return key && !key.startsWith("lead.error.")
      ? key
      : "Sign in again, then save the lead.";
  }
  if (status === 404 || /ownerNotFound/i.test(key)) {
    return "The selected owner is not a member of this workspace. Pick a teammate from the list, or leave owner unset.";
  }
  if (key.startsWith("lead.error.")) {
    if (/invalid/i.test(key)) {
      return "The CRM rejected this lead. Check email, website URL, and estimated value.";
    }
    return "The CRM could not save this lead.";
  }
  if (status >= 500 || /internal server error/i.test(key)) {
    return "The CRM request failed. The lead can still be saved on this device.";
  }
  return text || `Lead request failed (${status})`;
}

let sessionOverride: CrmSession | null = null;
let fetchImpl: typeof fetch = fetch;

/** Test / smoke: pin a CRM session so client calls skip ensureCrmSession. */
export function bindCrmLeadSession(session: CrmSession | null) {
  sessionOverride = session;
}

/** Test / smoke: intercept CRM HTTP. */
export function bindCrmLeadFetch(next: typeof fetch | null) {
  fetchImpl = next ?? fetch;
}

async function resolveSession(): Promise<CrmSession | null> {
  if (sessionOverride) return sessionOverride;
  return ensureCrmSession();
}

function crmRequestUrl(path: string): string {
  if (sessionOverride) {
    return `${sessionOverride.baseUrl}${path}`;
  }
  if (!path.startsWith("/v1/")) {
    throw new Error(`CRM path must start with /v1/: ${path}`);
  }
  return `/api/auth/crm${path.slice(3)}`;
}

async function crmRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchImpl(crmRequestUrl(path), {
    ...init,
    credentials: sessionOverride ? init?.credentials : "same-origin",
    headers: {
      Accept: "application/json",
      ...(sessionOverride
        ? { Authorization: `Bearer ${sessionOverride.accessToken}` }
        : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: Envelope<T> | T | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as Envelope<T> | T;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    throw new CrmLeadHttpError(res.status, crmErrorMessage(json, res.status));
  }

  if (json && typeof json === "object" && "data" in json) {
    return (json as Envelope<T>).data as T;
  }
  return json as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function looksLikeLead(value: unknown): value is CrmLead {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" ||
    typeof value.firstName === "string" ||
    typeof value.email === "string"
  );
}

function asLeadList(data: unknown): CrmLead[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return asLeadList(data[0]);
    }
    return data.filter(looksLikeLead);
  }
  if (!isRecord(data)) return [];
  for (const key of ["items", "leads", "records", "rows", "results", "data"]) {
    if (key in data) {
      const nested = asLeadList(data[key]);
      if (nested.length) return nested;
    }
  }
  return [];
}

function columnRecords(col: Record<string, unknown>): CrmLead[] {
  for (const key of ["records", "leads", "items", "cards", "data"]) {
    const nested = asLeadList(col[key]);
    if (nested.length) return nested;
  }
  return [];
}

function asKanbanColumns(data: unknown): CrmLeadKanbanColumn[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (data.some(looksLikeLead) && !data.some((row) => isRecord(row) && ("records" in row || "pipelineStage" in row))) {
      return leadsToKanban(data.filter(looksLikeLead));
    }
    return data.filter(isRecord).map((col) => {
      const records = columnRecords(col);
      return {
        status: typeof col.status === "string" ? col.status : undefined,
        pipelineStage:
          typeof col.pipelineStage === "string" ? col.pipelineStage : undefined,
        pipelineStageCode:
          typeof col.pipelineStageCode === "string"
            ? col.pipelineStageCode
            : undefined,
        records,
        total: typeof col.total === "number" ? col.total : records.length,
      };
    });
  }
  if (!isRecord(data)) return [];
  for (const key of ["columns", "stages", "items", "data"]) {
    if (key in data) {
      const nested = asKanbanColumns(data[key]);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function currentCrmUserId(accessToken: string): string | undefined {
  const payload = decodeJwtPayload(accessToken);
  const id = payload?.sub ?? payload?.userId ?? payload?.id;
  return typeof id === "string" && isUuid(id) ? id : undefined;
}

export async function fetchLeadList(query: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<CrmLead[]> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 100));
  if (query.search) params.set("search", query.search);
  const qs = params.toString();
  const data = await crmRequest<unknown>(
    `/v1/leads${qs ? `?${qs}` : ""}`,
  );
  return asLeadList(data);
}

export async function fetchLeadKanban(): Promise<CrmLeadKanbanColumn[] | null> {
  const data = await crmRequest<unknown>(
    "/v1/leads/kanban?groupBy=pipelineStage&limitPerStatus=50",
  );
  return asKanbanColumns(data);
}

export async function fetchLeadById(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}`);
}

async function defaultOwnerId(): Promise<string | undefined> {
  const session = await resolveSession();
  return session ? currentCrmUserId(session.accessToken) : undefined;
}

async function resolveLeadOwnerId(preferred?: string): Promise<string | undefined> {
  if (preferred && isUuid(preferred)) return preferred;
  const session = await resolveSession();
  const jwt = session ? currentCrmUserId(session.accessToken) : undefined;
  try {
    const members = await listCrmWorkspaceMembers();
    const hint = preferred?.trim().toLowerCase();
    const match =
      members.find((m) => m.userId === jwt || m.id === jwt) ??
      (hint
        ? members.find((m) => m.name.trim().toLowerCase() === hint)
        : undefined) ??
      members.find((m) => isUuid(m.userId));
    if (match && isUuid(match.userId)) return match.userId;
    if (match && isUuid(match.id)) return match.id;
  } catch {
    /* directory optional */
  }
  return jwt;
}

export async function createCrmLead(
  input: CrmCreateLeadInput,
  ownerHint?: string,
): Promise<CrmLead | null> {
  const resolvedOwner = await resolveLeadOwnerId(input.ownerId ?? ownerHint);
  const ownerId =
    resolvedOwner && isUuid(resolvedOwner) ? resolvedOwner : undefined;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim() || firstName;
  const email = input.email.trim().toLowerCase();
  const pipelineStage = uiPipelineStageToCrm(input.pipelineStage);

  const postLead = (body: Record<string, unknown>) =>
    crmRequest<CrmLead>("/v1/leads", {
      method: "POST",
      body: JSON.stringify(body),
    });

  const recover = async (): Promise<CrmLead | null> => {
    try {
      const listed = await fetchLeadList({ page: 1, limit: 100 });
      const needle = email.trim().toLowerCase();
      return (
        listed.find((row) => row.email?.trim().toLowerCase() === needle) ?? null
      );
    } catch {
      return null;
    }
  };

  let created: CrmLead | null = null;
  try {
    created = await postLead(compactBody({ firstName, lastName, email }));
  } catch (err) {
    created = await recover();
    if (!created) {
      if (ownerId) {
        try {
          created = await postLead(
            compactBody({ firstName, lastName, email, ownerId }),
          );
        } catch {
          created = await recover();
        }
      }
    }
    if (!created) {
      if (err instanceof CrmLeadHttpError && err.status >= 500) {
        return null;
      }
      throw err;
    }
  }

  const extras = compactBody({
    phone: input.phone,
    companyName: input.companyName,
    source: input.source,
    notes: input.notes,
    ownerId,
    mobilePhone: input.mobilePhone,
    jobTitle: input.jobTitle,
    linkedinUrl: input.linkedinUrl,
    companyWebsite: input.companyWebsite,
    industry: input.industry,
    companySize: input.companySize,
    productInterest: input.productInterest,
    budgetRange: input.budgetRange,
    estimatedValue: input.estimatedValue,
    description: input.description,
  });
  if (created.id && isUuid(created.id) && Object.keys(extras).length) {
    try {
      created =
        (await crmRequest<CrmLead>(`/v1/leads/${created.id}`, {
          method: "PATCH",
          body: JSON.stringify(extras),
        })) ?? created;
    } catch {
      /* lead exists even if enrichment fails */
    }
  }
  if (created.id && pipelineStage && pipelineStage !== "NEW_LEAD") {
    try {
      created =
        (await changeCrmLeadPipelineStage(created.id, pipelineStage)) ?? created;
    } catch {
      /* keep created row */
    }
  }
  return created;
}

export async function updateCrmLead(
  id: string,
  patch: Partial<CrmCreateLeadInput> & { status?: CrmLeadStatus },
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function changeCrmLeadStatus(
  id: string,
  status: CrmLeadStatus,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function assignCrmLeadOwner(
  id: string,
  ownerId: string,
): Promise<CrmLead | null> {
  if (!isUuid(id) || !isUuid(ownerId)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/owner`, {
    method: "PATCH",
    body: JSON.stringify({ ownerId }),
  });
}

export async function unassignCrmLeadOwner(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/owner`, {
    method: "DELETE",
  });
}

export async function linkCrmLeadCompany(
  id: string,
  companyId: string,
): Promise<CrmLead | null> {
  if (!isUuid(id) || !isUuid(companyId)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/company`, {
    method: "PATCH",
    body: JSON.stringify({ companyId }),
  });
}

export async function unlinkCrmLeadCompany(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/company`, {
    method: "DELETE",
  });
}

export async function changeCrmLeadLifecycleStage(
  id: string,
  lifecycleStage: string,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/lifecycle-stage`, {
    method: "PATCH",
    body: JSON.stringify({ lifecycleStage }),
  });
}

export async function changeCrmLeadRating(
  id: string,
  rating: string | null,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/rating`, {
    method: "PATCH",
    body: JSON.stringify({ rating }),
  });
}

export async function changeCrmLeadScore(
  id: string,
  score: number,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/score`, {
    method: "PATCH",
    body: JSON.stringify({ score }),
  });
}

export async function softDeleteCrmLead(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}`, { method: "DELETE" });
}

export async function bulkCrmLeads(input: {
  ids: string[];
  operation: "ASSIGN_OWNER" | "CHANGE_STATUS" | "SOFT_DELETE";
  ownerId?: string;
  status?: CrmLeadStatus;
}): Promise<CrmBulkResult | null> {
  const ids = input.ids.filter(isUuid);
  if (!ids.length) return null;
  return crmRequest<CrmBulkResult>("/v1/leads/bulk", {
    method: "POST",
    body: JSON.stringify({ ...input, ids }),
  });
}

export async function importCrmLeads(input: {
  rows: CrmCreateLeadInput[];
  duplicateHandling: "SKIP" | "UPDATE";
  defaultStatus?: CrmLeadStatus;
  defaultSource?: CrmLeadSource;
}): Promise<CrmImportResult | null> {
  if (!input.rows.length) return { created: 0, updated: 0, skipped: 0, errors: [] };
  const ownerId = await defaultOwnerId();
  return crmRequest<CrmImportResult>("/v1/leads/import", {
    method: "POST",
    body: JSON.stringify({
      source: "CSV",
      duplicateHandling: input.duplicateHandling,
      defaultStatus: input.defaultStatus,
      defaultSource: input.defaultSource,
      defaultOwnerId: ownerId,
      rows: input.rows.slice(0, 100),
    }),
  });
}

export async function importCrmLeadsFromAds(input: {
  platform: "meta" | "google" | "linkedin" | "tiktok";
  rows: CrmCreateLeadInput[];
  duplicateHandling: "SKIP" | "UPDATE";
  campaignId?: string;
}): Promise<CrmImportResult | null> {
  if (!input.rows.length) return { created: 0, updated: 0, skipped: 0, errors: [] };
  const ownerId = await defaultOwnerId();
  return crmRequest<CrmImportResult>("/v1/leads/import/ads", {
    method: "POST",
    body: JSON.stringify({
      platform: input.platform,
      campaignId: input.campaignId,
      duplicateHandling: input.duplicateHandling,
      defaultOwnerId: ownerId,
      rows: input.rows.slice(0, 100),
    }),
  });
}

export async function importCrmLeadsFromSheets(input: {
  spreadsheetId: string;
  mapping: Record<string, string>;
  duplicateHandling: "SKIP" | "UPDATE";
  sheetName?: string;
  rows?: CrmCreateLeadInput[];
  records?: Array<Record<string, string>>;
}): Promise<CrmImportResult | null> {
  const ownerId = await defaultOwnerId();
  return crmRequest<CrmImportResult>("/v1/leads/import/sheets", {
    method: "POST",
    body: JSON.stringify({
      spreadsheetId: input.spreadsheetId,
      sheetName: input.sheetName,
      mapping: input.mapping,
      duplicateHandling: input.duplicateHandling,
      defaultOwnerId: ownerId,
      rows: input.rows?.slice(0, 100),
      records: input.records?.slice(0, 100),
    }),
  });
}

export type CrmLeadConversationItem = {
  id: string;
  channel: string;
  kind?: string;
  direction?: string;
  fromName?: string;
  body: string;
  subject?: string;
  at: string;
  status?: string;
  durationSeconds?: number;
};

export async function fetchLeadConversations(
  id: string,
  query: { channel?: string; page?: number; limit?: number } = {},
): Promise<{ records: CrmLeadConversationItem[]; total: number } | null> {
  if (!isUuid(id)) return null;
  const params = new URLSearchParams();
  if (query.channel) params.set("channel", query.channel);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const data = await crmRequest<{
    records?: CrmLeadConversationItem[];
    total?: number;
  }>(`/v1/leads/${id}/conversations${qs ? `?${qs}` : ""}`);
  return {
    records: Array.isArray(data?.records) ? data.records : [],
    total: data?.total ?? 0,
  };
}

export async function postLeadConversation(
  id: string,
  input: {
    channel: "whatsapp" | "sms" | "email" | "call";
    body: string;
    subject?: string;
    send?: boolean;
  },
): Promise<CrmLeadConversationItem | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLeadConversationItem>(
    `/v1/leads/${id}/conversations`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function fetchLeadCreditReport(id: string): Promise<unknown | null> {
  if (!isUuid(id)) return null;
  return crmRequest<unknown>(`/v1/leads/${id}/credit-report`);
}

export async function refreshLeadCreditReport(id: string): Promise<unknown | null> {
  if (!isUuid(id)) return null;
  return crmRequest<unknown>(`/v1/leads/${id}/credit-report/refresh`, {
    method: "POST",
  });
}

export async function fetchLeadMortgage(id: string): Promise<{ payload: Record<string, unknown> } | null> {
  if (!isUuid(id)) return null;
  return crmRequest<{ payload: Record<string, unknown> }>(
    `/v1/leads/${id}/mortgage`,
  );
}

export async function putLeadMortgage(
  id: string,
  input: { payload: Record<string, unknown>; merge?: boolean },
): Promise<{ payload: Record<string, unknown> } | null> {
  if (!isUuid(id)) return null;
  return crmRequest<{ payload: Record<string, unknown> }>(
    `/v1/leads/${id}/mortgage`,
    {
      method: "PUT",
      body: JSON.stringify({
        payload: input.payload,
        merge: input.merge ?? true,
      }),
    },
  );
}

export async function changeCrmLeadPipelineStage(
  id: string,
  pipelineStage: string,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/pipeline-stage`, {
    method: "PATCH",
    body: JSON.stringify({ pipelineStage }),
  });
}

export async function replaceCrmLeadTags(
  id: string,
  tags: string[],
): Promise<string[] | CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<string[] | CrmLead>(`/v1/leads/${id}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tags }),
  });
}

export async function replaceCrmLeadFollowers(
  id: string,
  followerIds: string[],
): Promise<CrmLead | string[] | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead | string[]>(`/v1/leads/${id}/followers`, {
    method: "PUT",
    body: JSON.stringify({ followerIds: followerIds.filter(isUuid) }),
  });
}

export async function addCrmLeadFollower(
  id: string,
  userId: string,
): Promise<CrmLead | null> {
  if (!isUuid(id) || !isUuid(userId)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/followers`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function addCrmLeadFollowerById(
  id: string,
  userId: string,
): Promise<CrmLead | null> {
  if (!isUuid(id) || !isUuid(userId)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/followers/${userId}`, {
    method: "POST",
  });
}

export async function removeCrmLeadFollower(
  id: string,
  userId: string,
): Promise<CrmLead | null> {
  if (!isUuid(id) || !isUuid(userId)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/followers/${userId}`, {
    method: "DELETE",
  });
}

export async function convertCrmLead(
  id: string,
  targets: {
    convertedDealId?: string;
    convertedContactId?: string;
    convertedCompanyId?: string;
  },
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  return crmRequest<CrmLead>(`/v1/leads/${id}/convert`, {
    method: "POST",
    body: JSON.stringify(targets),
  });
}

export async function createCrmDeal(input: {
  name: string;
  value?: string;
  expectedCloseDate?: string;
  stage?: string;
  companyId?: string;
  ownerId?: string;
}): Promise<{ id: string } | null> {
  const body: Record<string, unknown> = {
    name: input.name,
    stage: input.stage ? uiDealStageToCrm(input.stage) : undefined,
    value: parseEstimatedValue(input.value),
    expectedCloseDate: input.expectedCloseDate
      ? input.expectedCloseDate.includes("T")
        ? input.expectedCloseDate
        : `${input.expectedCloseDate}T00:00:00.000Z`
      : undefined,
    companyId: input.companyId,
    ownerId: input.ownerId ?? (await defaultOwnerId()),
  };
  return crmRequest<{ id: string }>("/v1/deals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function leadsToKanban(leads: CrmLead[]): CrmLeadKanbanColumn[] {
  const byStage = new Map<string, CrmLead[]>();
  for (const lead of leads) {
    const stage = crmLeadPipelineStage(lead);
    byStage.set(stage, [...(byStage.get(stage) ?? []), lead]);
  }
  return [...byStage.entries()].map(([pipelineStage, records]) => ({
    pipelineStage,
    records,
    total: records.length,
  }));
}

function mergeLeadRows(groups: CrmLead[][]): CrmLead[] {
  const byId = new Map<string, CrmLead>();
  for (const group of groups) {
    for (const lead of group) {
      if (!lead?.id) continue;
      byId.set(lead.id, { ...(byId.get(lead.id) ?? {}), ...lead });
    }
  }
  return [...byId.values()];
}

export async function refreshCrmLeadsBoard(): Promise<boolean> {
  let kanbanFailed = false;
  let listFailed = false;
  let columns: CrmLeadKanbanColumn[] = [];
  let listed: CrmLead[] = [];
  try {
    columns = (await fetchLeadKanban()) ?? [];
  } catch {
    kanbanFailed = true;
  }
  try {
    listed = await fetchLeadList({ page: 1, limit: 100 });
  } catch {
    listFailed = true;
  }
  if (kanbanFailed && listFailed) return false;
  const fromKanban = columns.flatMap((col) => col.records ?? []);
  const merged = mergeLeadRows([fromKanban, listed]);
  saveLeadColumns(
    mergeRemoteLeadColumns(
      kanbanColumnsToBoard(
        merged.length ? leadsToKanban(merged) : columns,
      ),
    ),
  );
  emitRulesChange("all");
  return true;
}

export async function syncCreatedLead(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  source?: LeadSource;
  productInterest?: string;
  budgetRange?: string;
  estimatedValue?: string;
  notes?: string;
  ownerId?: string;
  ownerName?: string;
  pipelineStage?: string;
}): Promise<LeadCardData | null> {
  const created = await createCrmLead(
    toCrmCreateBody({
      ...input,
      pipelineStage: input.pipelineStage,
    }),
    input.ownerId ?? input.ownerName,
  );
  if (!created) return null;
  let lead = created;
  if (input.pipelineStage && input.pipelineStage !== "New Lead") {
    try {
      lead =
        (await changeCrmLeadPipelineStage(created.id, input.pipelineStage)) ??
        created;
    } catch {
      const desired = pipelineStageToCrmStatus(input.pipelineStage);
      if (desired !== "NEW") {
        try {
          lead = (await changeCrmLeadStatus(created.id, desired)) ?? created;
        } catch {
          lead = created;
        }
      }
    }
  }
  const card = mapCrmLeadToCard(lead);
  if (input.ownerName && !isUuid(input.ownerName)) {
    card.owner = input.ownerName;
  }
  upsertLeadFromCard(card);
  emitRulesChange("all");
  return card;
}

export async function syncLeadStatus(
  id: string,
  pipelineStage: string,
): Promise<LeadCardData | null> {
  try {
    let updated: CrmLead | null = null;
    try {
      updated = await changeCrmLeadPipelineStage(id, pipelineStage);
    } catch {
      updated = await changeCrmLeadStatus(
        id,
        pipelineStageToCrmStatus(pipelineStage),
      );
    }
    if (!updated) return null;
    const card = mapCrmLeadToCard(updated);
    upsertLeadFromCard(card);
    emitRulesChange("all");
    return card;
  } catch {
    await refreshCrmLeadsBoard();
    return null;
  }
}

export { isUuid, uiStatusToCrm, uiSourceToCrm };
