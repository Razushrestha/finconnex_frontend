import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import {
  WORKFLOW_RULE_TRIGGERS,
  formatWorkflowRuleAt,
  upsertWorkflowRule,
  type WorkflowRule,
  type WorkflowRuleStatus,
  type WorkflowRuleTrigger,
} from "@/lib/workflow-rules/types";

export type CrmWorkflowRuleQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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

export function workflowRulesPath(suffix = ""): string {
  return `/v1/workflow-rules${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "rules", "records", "rows", "result", "results"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
    if (rec.rule && typeof rec.rule === "object") {
      return extractRecords(rec.rule);
    }
  }
  return [];
}

function stringifyUnknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function mapWorkflowRuleTrigger(raw: string): WorkflowRuleTrigger {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("lead")) return "Lead Created";
  if (value.includes("deal") || value.includes("stage")) {
    return "Deal Stage Change";
  }
  if (value.includes("overdue") || value.includes("task")) {
    return "Task Overdue";
  }
  if (value.includes("form")) return "Form Submitted";
  if (value.includes("update") || value.includes("change")) {
    return "Record Updated";
  }
  if (value.includes("manual")) return "Manual";
  return (
    WORKFLOW_RULE_TRIGGERS.find((t) => t.toLowerCase() === value) ?? "Manual"
  );
}

function apiTrigger(trigger: WorkflowRuleTrigger): string {
  return trigger.toUpperCase().replace(/\s+/g, "_");
}

export function mapWorkflowRuleStatus(
  raw: string,
  enabled: boolean,
): WorkflowRuleStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("draft")) return "Draft";
  if (value.includes("disable") || value.includes("inactive") || value.includes("off")) {
    return "Disabled";
  }
  if (value.includes("active") || value.includes("enable")) return "Active";
  return enabled ? "Active" : "Disabled";
}

function asEnabled(row: Record<string, unknown>): boolean {
  if (typeof row.enabled === "boolean") return row.enabled;
  if (typeof row.isEnabled === "boolean") return row.isEnabled;
  if (typeof row.active === "boolean") return row.active;
  if (typeof row.isActive === "boolean") return row.isActive;
  const status = pickStr(row.status).toLowerCase();
  if (status.includes("disable") || status.includes("draft")) return false;
  if (status.includes("active") || status.includes("enable")) return true;
  return true;
}

export function normalizeWorkflowRule(
  row: Record<string, unknown>,
  index = 0,
): WorkflowRule {
  const id = pickStr(row.id, row.ruleId, row.uuid) || `wr-remote-${index}`;
  const name = pickStr(row.name, row.title, row.label) || "Untitled rule";
  const enabled = asEnabled(row);
  const triggerRaw = pickStr(
    row.trigger,
    row.triggerType,
    row.event,
    row.when,
  );
  return {
    id,
    ruleId: pickStr(row.ruleId, row.code, row.ref) || id.slice(0, 8).toUpperCase(),
    name,
    description: pickStr(row.description, row.summary, row.prompt),
    trigger: mapWorkflowRuleTrigger(triggerRaw),
    conditions: stringifyUnknown(
      row.conditions ?? row.condition ?? row.when ?? row.filters,
    ),
    actions: stringifyUnknown(row.actions ?? row.action ?? row.then ?? row.steps),
    enabled,
    status: mapWorkflowRuleStatus(pickStr(row.status), enabled),
    createdBy: pickStr(row.createdBy, row.createdByName, row.ownerName, "CRM"),
    createdAt: pickStr(row.createdAt, row.created_at) || formatWorkflowRuleAt(),
    updatedAt:
      pickStr(row.updatedAt, row.updated_at, row.modifiedAt) ||
      formatWorkflowRuleAt(),
  };
}

export function normalizeWorkflowRules(data: unknown): WorkflowRule[] {
  const records = extractRecords(data);
  if (records.length) return records.map((row, i) => normalizeWorkflowRule(row, i));
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    if (pickStr(rec.id, rec.name, rec.title)) {
      return [normalizeWorkflowRule(rec, 0)];
    }
  }
  return [];
}

async function rulesRequest(suffix: string, init?: RequestInit): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage workflow rules");
  return crmFetch(auth, workflowRulesPath(suffix), init);
}

function asRule(data: unknown): WorkflowRule | null {
  return normalizeWorkflowRules(data)[0] ?? null;
}

export async function listCrmWorkflowRules(
  query: CrmWorkflowRuleQuery = {},
): Promise<WorkflowRule[]> {
  return normalizeWorkflowRules(
    await rulesRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
      }),
    ),
  );
}

export async function getCrmWorkflowRule(
  id: string,
): Promise<WorkflowRule | null> {
  return asRule(await rulesRequest(`/${id}`));
}

export function toCreateWorkflowRuleBody(input: {
  name: string;
  description?: string;
  trigger: WorkflowRuleTrigger;
  conditions?: string;
  actions?: string;
  enabled?: boolean;
  status?: WorkflowRuleStatus;
}): Record<string, unknown> {
  const enabled = input.enabled ?? input.status === "Active";
  const trigger = apiTrigger(input.trigger);
  return {
    name: input.name,
    title: input.name,
    description: input.description ?? "",
    trigger,
    triggerType: trigger,
    conditions: input.conditions ?? "",
    actions: input.actions ?? "",
    enabled,
    isEnabled: enabled,
    status: (input.status ?? (enabled ? "Active" : "Draft")).toUpperCase(),
  };
}

export async function createCrmWorkflowRule(
  input: Parameters<typeof toCreateWorkflowRuleBody>[0],
): Promise<WorkflowRule | null> {
  return asRule(
    await rulesRequest("", {
      method: "POST",
      body: JSON.stringify(toCreateWorkflowRuleBody(input)),
    }),
  );
}

export async function updateCrmWorkflowRule(
  id: string,
  patch: Partial<WorkflowRule>,
): Promise<WorkflowRule | null> {
  const body: Record<string, unknown> = {};
  if (patch.name) {
    body.name = patch.name;
    body.title = patch.name;
  }
  if (patch.description != null) body.description = patch.description;
  if (patch.trigger) {
    const trigger = apiTrigger(patch.trigger);
    body.trigger = trigger;
    body.triggerType = trigger;
  }
  if (patch.conditions != null) body.conditions = patch.conditions;
  if (patch.actions != null) body.actions = patch.actions;
  if (patch.enabled != null) {
    body.enabled = patch.enabled;
    body.isEnabled = patch.enabled;
  }
  if (patch.status) body.status = patch.status.toUpperCase();
  return asRule(
    await rulesRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmWorkflowRule(id: string): Promise<void> {
  await rulesRequest(`/${id}`, { method: "DELETE" });
}

export async function suggestCrmWorkflowRule(
  description: string,
): Promise<WorkflowRule | null> {
  const data = await rulesRequest("/suggest", {
    method: "POST",
    body: JSON.stringify({
      description,
      prompt: description,
      text: description,
    }),
  });
  return asRule(data);
}

export async function tryCrmWorkflowRule<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteWorkflowRule(row: WorkflowRule | null) {
  if (row) upsertWorkflowRule(row);
  return row;
}

export function isCrmWorkflowRuleId(id: string): boolean {
  return isUuid(id);
}
