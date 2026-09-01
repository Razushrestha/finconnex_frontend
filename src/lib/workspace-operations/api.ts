import {
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { SettingsValues } from "@/lib/settings/settings-store";
import {
  normalizeWorkspaceMember,
  normalizeWorkspaceMembers,
} from "@/lib/workspace-members/api";
import type { WorkspaceMember } from "@/lib/workspace-members/types";
import type {
  WorkspaceChecklistItem,
  WorkspaceMemberPreferences,
  WorkspaceMembersAdminPage,
  WorkspaceProfile,
} from "@/lib/workspace-operations/types";

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
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

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (rec.data && rec.data !== raw && typeof rec.data === "object" && !Array.isArray(rec.data)) {
    return rec.data as Record<string, unknown>;
  }
  return rec;
}

function numberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = pickNum(value);
  }
  return out;
}

export function workspaceProfilePath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/profile`;
}

export function workspaceMembersAdminPath(
  workspaceId: string,
  query = "",
): string {
  return `/v1/workspaces/${workspaceId}/members-admin${query}`;
}

export function workspaceMemberPreferencesPath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/members/me/preferences`;
}

export function workspaceLeavePath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/members/leave`;
}

export function workspaceMemberDeactivatePath(
  workspaceId: string,
  memberId: string,
): string {
  return `/v1/workspaces/${workspaceId}/members/${memberId}/deactivate`;
}

export function workspaceMemberActivatePath(
  workspaceId: string,
  memberId: string,
): string {
  return `/v1/workspaces/${workspaceId}/members/${memberId}/activate`;
}

async function requireSession(): Promise<CrmSession> {
  const session = await ensureCrmSession();
  if (!session) {
    throw new Error("Sign in with a workspace to manage workspace operations");
  }
  return session;
}

export function normalizeWorkspaceProfile(raw: unknown): WorkspaceProfile {
  const rec = asRecord(raw) ?? {};
  const locale =
    rec.locale && typeof rec.locale === "object" && !Array.isArray(rec.locale)
      ? (rec.locale as Record<string, unknown>)
      : {};
  const checklistRaw = rec.checklist ?? rec.completionChecklist ?? rec.tasks;
  const checklist: WorkspaceChecklistItem[] = Array.isArray(checklistRaw)
    ? checklistRaw
        .filter(
          (row): row is Record<string, unknown> =>
            !!row && typeof row === "object" && !Array.isArray(row),
        )
        .map((row, i) => ({
          id: pickStr(row.id, row.key) || `check-${i}`,
          label: pickStr(row.label, row.title, row.name) || "Step",
          done:
            row.done === true ||
            row.completed === true ||
            pickStr(row.status).toLowerCase() === "done",
        }))
    : [];
  return {
    id: pickStr(rec.id, rec.workspaceId),
    name: pickStr(rec.name, rec.workspaceName) || "Workspace",
    slug: pickStr(rec.slug),
    status: pickStr(rec.status) || "Active",
    plan: pickStr(rec.plan, rec.planName) || "—",
    locale: pickStr(rec.locale, locale.code, locale.name),
    timezone: pickStr(rec.timezone, locale.timezone, locale.timeZone),
    language: pickStr(rec.language, locale.language),
    currency: pickStr(rec.currency, locale.currency),
    limits: numberMap(rec.limits ?? rec.quotas),
    usage: numberMap(rec.usage ?? rec.used),
    checklist,
  };
}

export function normalizeWorkspaceMemberPreferences(
  raw: unknown,
): WorkspaceMemberPreferences {
  const rec = asRecord(raw) ?? {};
  const nested =
    rec.preferences && typeof rec.preferences === "object" && !Array.isArray(rec.preferences)
      ? (rec.preferences as Record<string, unknown>)
      : rec;
  const out: WorkspaceMemberPreferences = {};
  for (const [key, value] of Object.entries(nested)) {
    if (typeof value === "string" || typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}

export function overlayMemberPreferences(
  values: SettingsValues,
  prefs: WorkspaceMemberPreferences | null,
): SettingsValues {
  if (!prefs) return values;
  const next = { ...values };
  for (const [key, value] of Object.entries(prefs)) {
    if (key in next) next[key] = value;
  }
  return next;
}

export function toMemberPreferencesPatch(
  values: SettingsValues,
): Record<string, unknown> {
  return { ...values };
}

function extractAdminPage(data: unknown): WorkspaceMembersAdminPage {
  const items = normalizeWorkspaceMembers(data);
  const rec = asRecord(data) ?? {};
  const meta =
    rec.metadata && typeof rec.metadata === "object"
      ? (rec.metadata as Record<string, unknown>)
      : rec;
  return {
    items,
    total: pickNum(meta.totalItems ?? rec.total ?? items.length),
  };
}

export async function getCrmWorkspaceProfile(): Promise<WorkspaceProfile> {
  const session = await requireSession();
  return normalizeWorkspaceProfile(
    await crmFetch(session, workspaceProfilePath(session.workspaceId)),
  );
}

export async function listCrmWorkspaceMembersAdmin(query: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}): Promise<WorkspaceMembersAdminPage> {
  const session = await requireSession();
  return extractAdminPage(
    await crmFetch(
      session,
      workspaceMembersAdminPath(
        session.workspaceId,
        toQuery({
          page: query.page ?? 1,
          limit: query.limit ?? 50,
          search: query.search,
          q: query.search,
          status: query.status,
        }),
      ),
    ),
  );
}

export async function getCrmWorkspaceMemberPreferences(): Promise<WorkspaceMemberPreferences> {
  const session = await requireSession();
  return normalizeWorkspaceMemberPreferences(
    await crmFetch(session, workspaceMemberPreferencesPath(session.workspaceId)),
  );
}

export async function updateCrmWorkspaceMemberPreferences(
  values: SettingsValues,
): Promise<WorkspaceMemberPreferences> {
  const session = await requireSession();
  return normalizeWorkspaceMemberPreferences(
    await crmFetch(session, workspaceMemberPreferencesPath(session.workspaceId), {
      method: "PATCH",
      body: JSON.stringify(toMemberPreferencesPatch(values)),
    }),
  );
}

export async function leaveCrmWorkspace(input: {
  reassignToMemberId?: string;
} = {}): Promise<void> {
  const session = await requireSession();
  await crmFetch(session, workspaceLeavePath(session.workspaceId), {
    method: "POST",
    body: JSON.stringify({
      reassignToMemberId: input.reassignToMemberId,
      memberId: input.reassignToMemberId,
    }),
  });
}

export async function deactivateCrmWorkspaceMember(
  memberId: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  const data = await crmFetch(
    session,
    workspaceMemberDeactivatePath(session.workspaceId, memberId),
    { method: "POST", body: JSON.stringify({}) },
  );
  const items = normalizeWorkspaceMembers(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeWorkspaceMember(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function activateCrmWorkspaceMember(
  memberId: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  const data = await crmFetch(
    session,
    workspaceMemberActivatePath(session.workspaceId, memberId),
    { method: "POST", body: JSON.stringify({}) },
  );
  const items = normalizeWorkspaceMembers(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeWorkspaceMember(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function tryCrmWorkspaceOperations<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
