import { ensureCrmAccess, ensureCrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  Automation,
  AutomationRun,
  CreateAutomationInput,
} from "./types";

export function automationsPath(suffix = ""): string {
  return `/v1/automations${suffix}`;
}

export function automationRunsPath(suffix = ""): string {
  return `/v1/automation-runs${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
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

/** The backend returns list endpoints as a Prisma `[items, total]` tuple. */
function extractList<T>(data: unknown): { items: T[]; total: number } {
  if (
    Array.isArray(data) &&
    data.length === 2 &&
    Array.isArray(data[0]) &&
    (typeof data[1] === "number" || data[1] == null)
  ) {
    return { items: data[0] as T[], total: (data[1] as number) ?? data[0].length };
  }
  if (Array.isArray(data)) return { items: data as T[], total: data.length };
  return { items: [], total: 0 };
}

async function automationsRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage automations");
  return crmFetch(auth, automationsPath(suffix), init);
}

async function runsRequest(suffix: string, init?: RequestInit): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage automations");
  return crmFetch(auth, automationRunsPath(suffix), init);
}

export type AutomationListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  triggerType?: string;
  search?: string;
};

export async function listAutomations(
  query: AutomationListQuery = {},
): Promise<{ items: Automation[]; total: number }> {
  const data = await automationsRequest(
    toQuery({
      page: query.page,
      limit: query.limit ?? 50,
      status: query.status,
      triggerType: query.triggerType,
      search: query.search,
    }),
  );
  return extractList<Automation>(data);
}

export async function getAutomation(id: string): Promise<Automation> {
  return automationsRequest(`/${id}`) as Promise<Automation>;
}

export async function createAutomation(
  input: CreateAutomationInput,
): Promise<Automation> {
  return automationsRequest("", {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<Automation>;
}

export async function updateAutomationDraft(
  id: string,
  patch: Partial<CreateAutomationInput>,
): Promise<Automation> {
  return automationsRequest(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<Automation>;
}

export async function createAutomationVersion(
  id: string,
  input: CreateAutomationInput,
): Promise<Automation> {
  return automationsRequest(`/${id}/versions`, {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<Automation>;
}

export async function deleteAutomation(id: string): Promise<void> {
  await automationsRequest(`/${id}`, { method: "DELETE" });
}

export async function enableAutomation(id: string): Promise<Automation> {
  return automationsRequest(`/${id}/enable`, { method: "POST" }) as Promise<Automation>;
}

export async function disableAutomation(id: string): Promise<Automation> {
  return automationsRequest(`/${id}/disable`, { method: "POST" }) as Promise<Automation>;
}

export async function pauseAutomation(id: string): Promise<Automation> {
  return automationsRequest(`/${id}/pause`, { method: "POST" }) as Promise<Automation>;
}

export async function resumeAutomation(id: string): Promise<Automation> {
  return automationsRequest(`/${id}/resume`, { method: "POST" }) as Promise<Automation>;
}

export async function duplicateAutomation(id: string): Promise<Automation> {
  return automationsRequest(`/${id}/duplicate`, {
    method: "POST",
  }) as Promise<Automation>;
}

export async function triggerAutomation(
  id: string,
  input: { entityId: string; snapshot: Record<string, unknown> },
): Promise<unknown> {
  return automationsRequest(`/${id}/trigger`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listAutomationRuns(
  automationId: string,
  query: { page?: number; limit?: number; status?: string } = {},
): Promise<{ items: AutomationRun[]; total: number }> {
  const data = await automationsRequest(
    `/${automationId}/runs${toQuery({
      page: query.page,
      limit: query.limit ?? 20,
      status: query.status,
    })}`,
  );
  return extractList<AutomationRun>(data);
}

export async function retryAutomationRun(runId: string): Promise<unknown> {
  return runsRequest(`/${runId}/retry`, { method: "POST" });
}

export async function cancelAutomationRun(runId: string): Promise<unknown> {
  return runsRequest(`/${runId}/cancel`, { method: "POST" });
}

export async function rollbackAutomationRun(runId: string): Promise<unknown> {
  return runsRequest(`/${runId}/rollback`, { method: "POST" });
}
