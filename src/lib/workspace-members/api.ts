import {
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { HierarchyLevel } from "@/lib/rules/permissions";
import {
  upsertWorkspaceMember,
  type CredentialsDelivery,
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

async function membersCrm<T>(path: string, init?: RequestInit): Promise<T> {
  if (isBoundCrmSession()) {
    return crmFetch(await requireSession(), path, init);
  }
  return crmBffFetch<T>(path, init);
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

export function mapWorkspaceMemberStatus(
  raw: string,
  extras?: { isActive?: unknown; joinedAt?: unknown },
): WorkspaceMemberStatus {
  if (extras?.isActive === false) return "Inactive";
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("pend") || value.includes("invite")) return "Invited";
  if (value.includes("inactive") || value.includes("disable")) {
    return "Inactive";
  }
  if (!raw && extras?.joinedAt == null) return "Invited";
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
  const joinedAt = pickStr(row.joinedAt, user.joinedAt) || undefined;
  const delivery = pickStr(row.invitationStatus).toUpperCase();
  return {
    id,
    userId: pickStr(row.userId, user.id, id),
    name,
    email: pickStr(row.email, user.email),
    role: isOwner ? "System Admin" : mapWorkspaceMemberRole(roleRaw),
    status: mapWorkspaceMemberStatus(statusRaw, {
      isActive: row.isActive,
      joinedAt: joinedAt || row.joinedAt,
    }),
    isOwner,
    team: pickStr(row.team, row.teamName) || undefined,
    joinedAt,
    mustChangePassword: user.mustChangePassword === true || row.mustChangePassword === true,
    credentialsDelivery: (["PENDING", "QUEUED", "DELIVERED", "FAILED"] as const).includes(
      delivery as CredentialsDelivery,
    )
      ? (delivery as CredentialsDelivery)
      : undefined,
    credentialsError: pickStr(row.invitationLastError) || undefined,
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
    total: pickNum(nested.total),
    joined: pickNum(nested.joined ?? nested.active ?? nested.accepted),
    pending: pickNum(
      nested.pending ??
        nested.invited ??
        nested.pendingInvitations ??
        nested.pendingInvites,
    ),
    awaitingPasswordChange: pickNum(nested.awaitingPasswordChange),
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
    await membersCrm(workspaceMembersPath(session.workspaceId)),
  );
}

export async function getCrmWorkspaceMember(
  memberId: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  return asMember(
    await membersCrm(workspaceMembersPath(session.workspaceId, `/${memberId}`)),
  );
}

export async function getCrmWorkspaceMembersSummary(): Promise<WorkspaceMembersSummary> {
  const session = await requireSession();
  return normalizeWorkspaceMembersSummary(
    await membersCrm(workspaceMembersSummaryPath(session.workspaceId)),
  );
}

export type NewWorkspaceMember = {
  fullName: string;
  email: string;
  /** What the member signs in with the first time; they must replace it. */
  password: string;
  role: HierarchyLevel;
  team?: string;
};

function newMemberBody(input: NewWorkspaceMember): Record<string, unknown> {
  const body: Record<string, unknown> = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: apiWorkspaceMemberRole(input.role),
  };
  const team = input.team?.trim();
  if (team) body.team = team;
  return body;
}

/**
 * Creates the member's account and adds them to the workspace; the CRM mails
 * them the credentials. `credentialsIssued` is false when the address already
 * had an account: they were added, and sign in with their own password ΓÇö the
 * one sent here was discarded.
 */
export async function createCrmWorkspaceMember(
  input: NewWorkspaceMember,
): Promise<{ member: WorkspaceMember | null; credentialsIssued: boolean }> {
  const session = await requireSession();
  const data = await membersCrm<unknown>(workspaceMembersPath(session.workspaceId), {
    method: "POST",
    body: JSON.stringify(newMemberBody(input)),
  });
  const rec =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return { member: asMember(data), credentialsIssued: rec.credentialsIssued !== false };
}

export async function updateCrmWorkspaceMember(
  memberId: string,
  patch: { role?: HierarchyLevel; team?: string },
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  const body: Record<string, unknown> = {};
  if (patch.role) {
    const role = apiWorkspaceMemberRole(patch.role);
    body.role = role;
    body.workspaceRole = role;
  }
  if (patch.team !== undefined) body.team = patch.team.trim();
  return asMember(
    await membersCrm(
      workspaceMembersPath(session.workspaceId, `/${memberId}`),
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  );
}

export async function deleteCrmWorkspaceMember(memberId: string): Promise<void> {
  const session = await requireSession();
  await membersCrm(workspaceMembersPath(session.workspaceId, `/${memberId}`), {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

/**
 * Mails the member new sign-in credentials; they must replace the password
 * at their next sign-in, and their sessions end now. Leave `password` out to
 * have the CRM generate a strong one. Fails with
 * `workspace.error.credentialsNotReissuable` for an account this workspace
 * didn't create ΓÇö its password belongs to its owner.
 */
export async function resendCrmWorkspaceCredentials(
  memberId: string,
  password?: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  return asMember(
    await membersCrm(
      workspaceMembersPath(session.workspaceId, `/${memberId}/credentials/resend`),
      { method: "POST", body: JSON.stringify(password ? { password } : {}) },
    ),
  );
}

export async function transferCrmWorkspaceOwnership(
  memberId: string,
): Promise<WorkspaceMember | null> {
  const session = await requireSession();
  return asMember(
    await membersCrm(workspaceOwnershipTransferPath(session.workspaceId), {
      method: "POST",
      body: JSON.stringify({
        memberId,
        userId: memberId,
        targetMemberId: memberId,
        newOwnerMemberId: memberId,
      }),
    }),
  );
}

/** Creates up to 100 members in one call; one bad row doesn't stop the rest. */
export async function importCrmWorkspaceMembers(
  items: NewWorkspaceMember[],
): Promise<{ created: number; attached: number; failed: Array<{ email: string; error: string }> }> {
  const session = await requireSession();
  const data = await membersCrm(workspaceMembersPath(session.workspaceId, "/import"), {
    method: "POST",
    body: JSON.stringify({ items: items.map(newMemberBody) }),
  });
  const rec =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const nested =
    rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)
      ? (rec.data as Record<string, unknown>)
      : rec;
  const failedRaw = Array.isArray(nested.failed) ? nested.failed : [];
  return {
    created: pickNum(nested.created),
    attached: pickNum(nested.attached),
    failed: failedRaw
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      .map((row) => ({
        email: pickStr(row.email),
        error: pickStr(row.error) || "Import failed",
      })),
  };
}

/**
 * A strong first password for a new member: 16 characters from a set without
 * look-alikes, so it survives being read out or retyped.
 */
export function generateMemberPassword(length = 16): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
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
