import {
  decodeJwtPayload,
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import {
  kanbanColumnsToBoard,
  mapCrmLeadToCard,
  parseEstimatedValue,
  pipelineStageToCrmStatus,
  toCrmCreateBody,
  uiDealStageToCrm,
} from "@/lib/leads/api/map";
import type {
  CrmBulkResult,
  CrmCreateLeadInput,
  CrmImportResult,
  CrmLead,
  CrmLeadKanbanColumn,
  CrmLeadListPage,
  CrmLeadSource,
  CrmLeadStatus,
} from "@/lib/leads/api/types";
import { saveLeadColumns, upsertLeadFromCard } from "@/lib/leads/store";
import { emitRulesChange } from "@/lib/rules/storage";
import type { LeadCardData, LeadSource } from "@/lib/leads/types";
import { uiSourceToCrm, uiStatusToCrm } from "@/lib/leads/api/map";

type Envelope<T> = {
  statusCode?: number;
  message?: string;
  data?: T;
};

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

async function crmRequest<T>(
  session: CrmSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetchImpl(`${session.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
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
    const message =
      json && typeof json === "object" && "message" in json
        ? String((json as Envelope<T>).message)
        : `Lead request failed (${res.status})`;
    throw new Error(message);
  }

  if (json && typeof json === "object" && "data" in json) {
    return (json as Envelope<T>).data as T;
  }
  return json as T;
}

function asLeadList(data: unknown): CrmLead[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return data[0] as CrmLead[];
    }
    if (data.every((item) => item && typeof item === "object" && "email" in item)) {
      return data as CrmLead[];
    }
  }
  if (typeof data === "object" && data !== null && "items" in data) {
    const items = (data as CrmLeadListPage).items;
    return Array.isArray(items) ? items : [];
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
  const session = await resolveSession();
  if (!session) return [];
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  const qs = params.toString();
  const data = await crmRequest<unknown>(
    session,
    `/v1/leads${qs ? `?${qs}` : ""}`,
  );
  return asLeadList(data);
}

export async function fetchLeadKanban(): Promise<CrmLeadKanbanColumn[] | null> {
  const session = await resolveSession();
  if (!session) return null;
  const data = await crmRequest<CrmLeadKanbanColumn[]>(
    session,
    "/v1/leads/kanban?limitPerStatus=50",
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchLeadById(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}`);
}

export async function createCrmLead(
  input: CrmCreateLeadInput,
): Promise<CrmLead | null> {
  const session = await resolveSession();
  if (!session) return null;
  const ownerId = input.ownerId ?? currentCrmUserId(session.accessToken);
  return crmRequest<CrmLead>(session, "/v1/leads", {
    method: "POST",
    body: JSON.stringify({ ...input, ownerId }),
  });
}

export async function updateCrmLead(
  id: string,
  patch: Partial<CrmCreateLeadInput> & { status?: CrmLeadStatus },
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function changeCrmLeadStatus(
  id: string,
  status: CrmLeadStatus,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function assignCrmLeadOwner(
  id: string,
  ownerId: string,
): Promise<CrmLead | null> {
  if (!isUuid(id) || !isUuid(ownerId)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/owner`, {
    method: "PATCH",
    body: JSON.stringify({ ownerId }),
  });
}

export async function unassignCrmLeadOwner(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/owner`, {
    method: "DELETE",
  });
}

export async function linkCrmLeadCompany(
  id: string,
  companyId: string,
): Promise<CrmLead | null> {
  if (!isUuid(id) || !isUuid(companyId)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/company`, {
    method: "PATCH",
    body: JSON.stringify({ companyId }),
  });
}

export async function unlinkCrmLeadCompany(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/company`, {
    method: "DELETE",
  });
}

export async function changeCrmLeadLifecycleStage(
  id: string,
  lifecycleStage: string,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/lifecycle-stage`, {
    method: "PATCH",
    body: JSON.stringify({ lifecycleStage }),
  });
}

export async function changeCrmLeadRating(
  id: string,
  rating: string | null,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/rating`, {
    method: "PATCH",
    body: JSON.stringify({ rating }),
  });
}

export async function changeCrmLeadScore(
  id: string,
  score: number,
): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/score`, {
    method: "PATCH",
    body: JSON.stringify({ score }),
  });
}

export async function softDeleteCrmLead(id: string): Promise<CrmLead | null> {
  if (!isUuid(id)) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}`, { method: "DELETE" });
}

export async function bulkCrmLeads(input: {
  ids: string[];
  operation: "ASSIGN_OWNER" | "CHANGE_STATUS" | "SOFT_DELETE";
  ownerId?: string;
  status?: CrmLeadStatus;
}): Promise<CrmBulkResult | null> {
  const ids = input.ids.filter(isUuid);
  if (!ids.length) return null;
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmBulkResult>(session, "/v1/leads/bulk", {
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
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmImportResult>(session, "/v1/leads/import", {
    method: "POST",
    body: JSON.stringify({
      source: "CSV",
      duplicateHandling: input.duplicateHandling,
      defaultStatus: input.defaultStatus,
      defaultSource: input.defaultSource,
      defaultOwnerId: currentCrmUserId(session.accessToken),
      rows: input.rows.slice(0, 100),
    }),
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
  const session = await resolveSession();
  if (!session) return null;
  return crmRequest<CrmLead>(session, `/v1/leads/${id}/convert`, {
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
  const session = await resolveSession();
  if (!session) return null;
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
    ownerId: input.ownerId ?? currentCrmUserId(session.accessToken),
  };
  return crmRequest<{ id: string }>(session, "/v1/deals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function leadsToKanban(leads: CrmLead[]): CrmLeadKanbanColumn[] {
  const byStatus = new Map<string, CrmLead[]>();
  for (const lead of leads) {
    const status = String(lead.status || "NEW");
    byStatus.set(status, [...(byStatus.get(status) ?? []), lead]);
  }
  return [...byStatus.entries()].map(([status, records]) => ({
    status,
    records,
    total: records.length,
  }));
}

export async function refreshCrmLeadsBoard(): Promise<boolean> {
  try {
    const columns = await fetchLeadKanban();
    if (columns) {
      const empty = columns.every((col) => !(col.records ?? []).length);
      if (!empty) {
        saveLeadColumns(kanbanColumnsToBoard(columns));
        emitRulesChange("all");
        return true;
      }
      const listed = await fetchLeadList({ limit: 100 });
      saveLeadColumns(
        kanbanColumnsToBoard(
          listed.length ? leadsToKanban(listed) : columns,
        ),
      );
      emitRulesChange("all");
      return true;
    }
    const session = await resolveSession();
    if (!session) return false;
    const listed = await fetchLeadList({ limit: 100 });
    saveLeadColumns(kanbanColumnsToBoard(leadsToKanban(listed)));
    emitRulesChange("all");
    return true;
  } catch {
    return false;
  }
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
  pipelineStage?: string;
}): Promise<LeadCardData | null> {
  const created = await createCrmLead(toCrmCreateBody(input));
  if (!created) return null;
  let lead = created;
  if (input.pipelineStage) {
    const desired = pipelineStageToCrmStatus(input.pipelineStage);
    if (desired !== "NEW") {
      lead = (await changeCrmLeadStatus(created.id, desired)) ?? created;
    }
  }
  const card = mapCrmLeadToCard(lead);
  upsertLeadFromCard(card);
  emitRulesChange("all");
  return card;
}

export async function syncLeadStatus(
  id: string,
  pipelineStage: string,
): Promise<LeadCardData | null> {
  try {
    const updated = await changeCrmLeadStatus(
      id,
      pipelineStageToCrmStatus(pipelineStage),
    );
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
