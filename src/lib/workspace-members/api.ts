import {
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { HierarchyLevel } from "@/lib/rules/permissions";
import {
  emptyWorkspaceMembersSummary,
  upsertWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceMemberStatus,
  type WorkspaceMembersSummary,
} from "@/lib/workspace-members/types";

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

export function workspaceMembersPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/members${suffix}`;
}

export function workspaceMembersSummaryPath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/members-summary`;
}

export function workspaceOwnershipTransferPath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/ownership-transfer`;
}

async function requireSession(): Promise<CrmSession> {
  const session = await ensureCrmSession();
  if (!session) {
    throw new Error("Sign in with a workspace to manage members");
  }
  return session;
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
    for (const key of [
      "items",
      "members",
      "records",
      "rows",
      "result",
      "results",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapWorkspaceMemberRole(raw: string): HierarchyLevel {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("owner") || value.includes("system")) {
    return "System Admin";
  }
  if (value.includes("org") || value === "admin") return "Org Admin";
  if (value.includes("manager")) return "Manager";
  if (value.includes("lead")) return "Team Lead";
  if (value.includes("read") || value.includes("view")) return "Read Only";
  return "User";
}

export function apiWorkspaceMemberRole(role: HierarchyLevel): string {
  switch (role) {
    case "System Admin":
      return "ADMIN";
    case "Org Admin":
      return "ADMIN";
    case "Manager":
      return "MANAGER";
    case "Team Lead":
      return "TEAM_LEAD";
    case "Read Only":
      return "VIEWER";
    default:
      return "MEMBER";
  }
}

export function mapWorkspaceMemberStatus(raw: string): WorkspaceMemberStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("pend") || value.includes("invite")) return "Invited";
  if (value.includes("inactive") || value.includes("disable")) {
    return "Inactive";
  }
  return "Active";
}

function nestedUser(row: Record<string, unknown>): Record<string, unknown> {
  if (row.user && typeof row.user === "object" && !Array.isArray(row.user)) {
    return row.user as Record<string, unknown>;
  }
  return {};
}

export function normalizeWorkspaceMember(
  row: Record<string, unknown>,
  index = 0,
): WorkspaceMember {
  const user = nestedUser(row);
  const id =
    pickStr(row.id, row.memberId, row.membershipId, user.id) ||
    `wm-remote-${index}`;
  const roleRaw = pickStr(row.role, row.workspaceRole, user.role);
  const statusRaw = pickStr(row.status, row.membershipStatus, row.inviteStatus);
  const isOwner =
    row.isOwner === true ||
    roleRaw.toUpperCase() === "OWNER" ||
    pickStr(row.role).toUpperCase() === "OWNER";
  const first = pickStr(user.firstName, row.firstName);
  const last = pickStr(user.lastName, row.lastName);
  const name =
    pickStr(row.name, row.displayName, user.name, user.userName) ||
    [first, last].filter(Boolean).join(" ") ||
    pickStr(row.email, user.email) ||
    "Member";
  return {
    id,
    userId: pickStr(row.userId, user.id, id),
    name,
    email: pickStr(row.email, user.email),
    role: isOwner ? "System Admin" : mapWorkspaceMemberRole(roleRaw),
    status: mapWorkspaceMemberStatus(statusRaw),
    isOwner,
    team: pickStr(row.team, row.teamName) || undefined,
  };
}

export function normalizeWorkspaceMembers(data: unknown): WorkspaceMember[] {
  return extractRecords(data).map((row, i) => normalizeWorkspaceMember(row, i));
}

export function normalizeWorkspaceMembersSummary(
  data: unknown,
): WorkspaceMembersSummary {
  const rec =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const nested =
    rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)
      ? (rec.data as Record<string, unknown>)
      : rec;
  const byRoleRaw = nested.byRole ?? nested.roles ?? nested.roleCounts;
  const byRole: Record<string, number> = {};
  if (byRoleRaw && typeof byRoleRaw === "object" && !Array.isArray(byRoleRaw)) {
    for (const [key, value] of Object.entries(
      byRoleRaw as Record<string, unknown>,
    )) {
      byRole[key] = pickNum(value);
    }
  }
  return {
    joined: pickNum(nested.joined ?? nested.active ?? nested.accepted),
    pending: pickNum(nested.pending ?? nested.invited),
    byRole,
  };
}

function asMember(data: unknown): WorkspaceMember | null {
  const items = normalizeWorkspaceMembers(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    if (pickStr(rec.id, rec.email, rec.memberId)) {
      return normalizeWorkspaceMember(rec, 0);
    }
  }
  return null;
}

export async function listCrmWorkspaceMembers(): Promise<WorkspaceMember[]> {
  const session = await requireSession();
  return normalizeWorkspaceMembers(
    await crmFetch(
      session,
      workspaceMembersPath(session.workspaceId),
    ),
  );
}

export async function getCrmWorkspaceMember(
  memberId: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  return asMember(
    await crmFetch(session, workspaceMembersPath(session.workspaceId, `/${memberId}`)),
  );
}

export async function getCrmWorkspaceMembersSummary(): Promise<WorkspaceMembersSummary> {
  const session = await requireSession();
  return normalizeWorkspaceMembersSummary(
    await crmFetch(session, workspaceMembersSummaryPath(session.workspaceId)),
  );
}

export async function inviteCrmWorkspaceMember(input: {
  email: string;
  name?: string;
  role: HierarchyLevel;
}): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  const role = apiWorkspaceMemberRole(input.role);
  return asMember(
    await crmFetch(session, workspaceMembersPath(session.workspaceId), {
      method: "POST",
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        name: input.name?.trim() || undefined,
        role,
        workspaceRole: role,
      }),
    }),
  );
}

export async function updateCrmWorkspaceMember(
  memberId: string,
  patch: { role?: HierarchyLevel; accept?: boolean },
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  const body: Record<string, unknown> = {};
  if (patch.role) {
    const role = apiWorkspaceMemberRole(patch.role);
    body.role = role;
    body.workspaceRole = role;
  }
  if (patch.accept) {
    body.accept = true;
    body.status = "JOINED";
  }
  return asMember(
    await crmFetch(
      session,
      workspaceMembersPath(session.workspaceId, `/${memberId}`),
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  );
}

export async function deleteCrmWorkspaceMember(memberId: string): Promise<void> {
  const session = await requireSession();
  await crmFetch(
    session,
    workspaceMembersPath(session.workspaceId, `/${memberId}`),
    { method: "DELETE" },
  );
}

export async function cancelCrmWorkspaceInvitation(
  memberId: string,
): Promise<void> {
  const session = await requireSession();
  await crmFetch(
    session,
    workspaceMembersPath(session.workspaceId, `/${memberId}/invitation`),
    { method: "DELETE" },
  );
}

export async function resendCrmWorkspaceInvitation(
  memberId: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  return asMember(
    await crmFetch(
      session,
      workspaceMembersPath(
        session.workspaceId,
        `/${memberId}/invitation/resend`,
      ),
      { method: "POST", body: JSON.stringify({}) },
    ),
  );
}

export async function transferCrmWorkspaceOwnership(
  memberId: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  return asMember(
    await crmFetch(session, workspaceOwnershipTransferPath(session.workspaceId), {
      method: "POST",
      body: JSON.stringify({
        memberId,
        userId: memberId,
        targetMemberId: memberId,
      }),
    }),
  );
}

export async function tryCrmWorkspaceMembers<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteWorkspaceMember(row: WorkspaceMember | null) {
  if (row) upsertWorkspaceMember(row);
  return row;
}

export function isCrmWorkspaceMemberId(id: string): boolean {
  return isUuid(id);
}
