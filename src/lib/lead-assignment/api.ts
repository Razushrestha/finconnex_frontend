import { ensureCrmAccess, ensureCrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  CreateLeadAssignmentRuleInput,
  LeadAssignmentRule,
  UpdateLeadAssignmentRuleInput,
} from "./types";

export function leadAssignmentRulesPath(suffix = ""): string {
  return `/v1/lead-assignment-rules${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

async function request(suffix: string, init?: RequestInit): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage lead assignment rules");
  return crmFetch(auth, leadAssignmentRulesPath(suffix), init);
}

export async function listLeadAssignmentRules(): Promise<
  LeadAssignmentRule[]
> {
  const data = await request("");
  return Array.isArray(data) ? (data as LeadAssignmentRule[]) : [];
}

export async function createLeadAssignmentRule(
  input: CreateLeadAssignmentRuleInput,
): Promise<LeadAssignmentRule> {
  return request("", {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<LeadAssignmentRule>;
}

export async function updateLeadAssignmentRule(
  id: string,
  patch: UpdateLeadAssignmentRuleInput,
): Promise<LeadAssignmentRule> {
  return request(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<LeadAssignmentRule>;
}

export async function deleteLeadAssignmentRule(id: string): Promise<void> {
  await request(`/${id}`, { method: "DELETE" });
}

export async function reorderLeadAssignmentRules(
  orderedIds: string[],
): Promise<LeadAssignmentRule[]> {
  const data = await request("/reorder", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
  return Array.isArray(data) ? (data as LeadAssignmentRule[]) : [];
}
