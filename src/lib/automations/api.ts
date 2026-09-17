import { crmWorkspaceFetch } from "@/lib/crm/request";
import type {
  Automation,
  AutomationFolder,
  AutomationRun,
  CreateAutomationInput,
} from "./types";

export function automationsPath(suffix = ""): string {
  return `/v1/automations${suffix}`;
}

export function automationRunsPath(suffix = ""): string {
  return `/v1/automation-runs${suffix}`;
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
  return crmWorkspaceFetch(automationsPath(suffix), init);
}

async function runsRequest(suffix: string, init?: RequestInit): Promise<unknown> {
  return crmWorkspaceFetch(automationRunsPath(suffix), init);
}

export type AutomationListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  triggerType?: string;
  search?: string;
  /** A folder id, or "root" for the top level. Omit to list every folder. */
  folderId?: string;
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
      folderId: query.folderId,
    }),
  );
  return extractList<Automation>(data);
}

export async function getAutomation(id: string): Promise<Automation> {
  return automationsRequest(`/${id}`) as Promise<Automation>;
}

/** Creation is the only write that files a workflow; later moves use `moveAutomation`. */
export async function createAutomation(
  input: CreateAutomationInput & { folderId?: string },
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
): Promise<{ id: string; version: number; status: string }> {
  return automationsRequest(`/${id}/versions`, {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<{ id: string; version: number; status: string }>;
}

export async function publishAutomationVersion(
  id: string,
  versionId: string,
): Promise<Automation> {
  return automationsRequest(`/${id}/versions/${versionId}/publish`, {
    method: "POST",
  }) as Promise<Automation>;
}

export type AutomationValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  irreversibleActions: string[];
};

export async function validateAutomation(
  id: string,
): Promise<AutomationValidationResult> {
  return automationsRequest(`/${id}/validate`, {
    method: "POST",
  }) as Promise<AutomationValidationResult>;
}

export type AutomationDryRunResult = {
  valid: boolean;
  triggerMatched: boolean;
  warnings: string[];
  errors: string[];
  irreversibleActions: string[];
  plannedSteps: Array<{
    index: number;
    path: string;
    key: string;
    type: string;
    action?: string;
    branch?: "then" | "else";
    target: string;
  }>;
  mutationPerformed: boolean;
};

export async function dryRunAutomation(
  id: string,
  input: { entityType: string; entityId?: string; snapshot: Record<string, unknown> },
): Promise<AutomationDryRunResult> {
  return automationsRequest(`/${id}/dry-run`, {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<AutomationDryRunResult>;
}

export async function listAutomationFolders(): Promise<AutomationFolder[]> {
  const data = await automationsRequest("/folders");
  return extractList<AutomationFolder>(data).items;
}

export async function createAutomationFolder(input: {
  name: string;
  parentId?: string | null;
}): Promise<AutomationFolder> {
  return automationsRequest("/folders", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      ...(input.parentId ? { parentId: input.parentId } : {}),
    }),
  }) as Promise<AutomationFolder>;
}

/** Rename a folder, or move it: `parentId: null` moves it to the top level. */
export async function updateAutomationFolder(
  id: string,
  patch: { name?: string; parentId?: string | null },
): Promise<AutomationFolder> {
  return automationsRequest(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<AutomationFolder>;
}

/** The backend refuses a folder that still holds workflows or folders. */
export async function deleteAutomationFolder(id: string): Promise<void> {
  await automationsRequest(`/folders/${id}`, { method: "DELETE" });
}

/**
 * Files a workflow in a folder, or at the top level with `null`. Unlike a
 * draft save, this leaves the workflow's versions and published state alone.
 */
export async function moveAutomation(
  id: string,
  folderId: string | null,
): Promise<void> {
  await automationsRequest(`/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ folderId }),
  });
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

export async function listWorkspaceAutomationRuns(
  query: { page?: number; limit?: number; status?: string } = {},
): Promise<{ items: AutomationRun[]; total: number }> {
  const data = await runsRequest(
    toQuery({
      page: query.page,
      limit: query.limit ?? 50,
      status: query.status,
    }),
  );
  return extractList<AutomationRun>(data);
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
