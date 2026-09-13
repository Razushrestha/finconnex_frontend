/**
 * Field ACL — GET/PUT/DELETE /v1/field-permissions
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { HierarchyLevel } from "@/lib/rules/permissions";

export type FieldEntityType = "LEAD" | "CONTACT" | "COMPANY" | "DEAL" | "TICKET" | "TASK";

export type CrmWorkspaceRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "TEAM_LEAD"
  | "MEMBER"
  | "VIEWER"
  | "GUEST";

export type CrmFieldPermission = {
  id: string;
  entityType: string;
  fieldName: string;
  role: CrmWorkspaceRole;
  canRead: boolean;
  canWrite: boolean;
};

export const UI_ROLE_TO_CRM: Partial<Record<HierarchyLevel, CrmWorkspaceRole>> = {
  Manager: "MANAGER",
  "Team Lead": "TEAM_LEAD",
  User: "MEMBER",
  "Read Only": "VIEWER",
};

export const FIELD_RESOURCE_TO_CRM: Record<string, string> = {
  "sales.leads.estimatedValue": "estimatedValue",
  "sales.leads.email": "email",
  "sales.leads.phone": "phone",
};

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to manage field permissions");
  if (isBoundCrmSession()) return crmFetch(scoped, path, init);
  return crmBffFetch(path, init);
}

function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: unknown }).items;
    return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
  }
  return [];
}

export function normalizeFieldPermission(
  raw: Record<string, unknown>,
): CrmFieldPermission {
  return {
    id: String(raw.id ?? ""),
    entityType: String(raw.entityType ?? "LEAD"),
    fieldName: String(raw.fieldName ?? ""),
    role: String(raw.role ?? "MEMBER") as CrmWorkspaceRole,
    canRead: raw.canRead !== false,
    canWrite: raw.canWrite !== false,
  };
}

export async function listCrmFieldPermissions(
  entityType: FieldEntityType = "LEAD",
): Promise<CrmFieldPermission[]> {
  const data = await call(
    `/v1/field-permissions?entityType=${encodeURIComponent(entityType)}`,
  );
  return asRows(data).map(normalizeFieldPermission);
}

export async function upsertCrmFieldPermission(input: {
  entityType: FieldEntityType;
  fieldName: string;
  role: CrmWorkspaceRole;
  canRead: boolean;
  canWrite: boolean;
}): Promise<CrmFieldPermission> {
  const data = await call("/v1/field-permissions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const rec =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return normalizeFieldPermission(rec);
}

export async function deleteCrmFieldPermission(id: string): Promise<void> {
  await call(`/v1/field-permissions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function tryCrmFieldPermissions<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
