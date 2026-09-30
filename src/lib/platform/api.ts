/**
 * Nest Super Admin APIs under `/v1/platform/*`.
 * Requires `User.globalRole = SUPER_ADMIN` on the CRM.
 */

import { crmWorkspaceFetch } from "@/lib/crm/request";
import { enterWorkspace } from "@/lib/admin/api";

export { enterWorkspace };

export type PlatformGlobalRole =
  | "USER"
  | "ADMIN"
  | "DEVELOPER"
  | "SUPER_ADMIN";

export type PlatformWorkspaceStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type PlatformWorkspacePlan =
  | "FREE"
  | "STARTER"
  | "PRO"
  | "BUSINESS"
  | "ENTERPRISE";

export type PlatformWorkspaceRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "TEAM_LEAD"
  | "MEMBER"
  | "VIEWER"
  | "GUEST";

export type PlatformStats = {
  totalWorkspaces: number;
  activeWorkspaces: number;
  suspendedWorkspaces: number;
  cancelledWorkspaces: number;
  deletedWorkspaces: number;
  totalUsers: number;
  superAdmins: number;
  workspacesByPlan: Record<string, number>;
};

export type PlatformUser = {
  id: string;
  email: string;
  userName: string;
  name: string | null;
  globalRole: PlatformGlobalRole | string;
  isVerified: boolean;
  workspaceCount: number;
  createdAt: string;
  deletedAt: string | null;
};

export type PlatformWorkspaceOwner = {
  userId: string;
  email: string;
  name: string | null;
};

export type PlatformWorkspace = {
  id: string;
  name: string;
  slug: string;
  status: PlatformWorkspaceStatus | string;
  plan: PlatformWorkspacePlan | string;
  memberCount: number;
  owners: PlatformWorkspaceOwner[];
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  recordCounts?: Record<string, number>;
};

export type PlatformWorkspaceMember = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  role: PlatformWorkspaceRole | string;
  isActive: boolean;
  joinedAt: string | null;
};

export type PlatformPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

type PaginatedMeta = {
  items?: unknown[];
  metadata?: {
    currentPage?: number;
    itemsPerPage?: number;
    totalItems?: number;
  };
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickNum(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
}

function toIsoOrNull(value: unknown): string | null {
  const raw = toIso(value);
  return raw || null;
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

function extractList(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return data[0] as unknown[];
    }
    return data;
  }
  if (typeof data === "object") {
    const rec = data as PaginatedMeta & Record<string, unknown>;
    if (Array.isArray(rec.items)) return rec.items;
    if (Array.isArray(rec.data)) return rec.data as unknown[];
  }
  return [];
}

function extractTotal(data: unknown, fallback: number): number {
  if (Array.isArray(data) && data.length === 2 && typeof data[1] === "number") {
    return data[1];
  }
  if (data && typeof data === "object") {
    const meta = (data as PaginatedMeta).metadata?.totalItems;
    if (typeof meta === "number") return meta;
    const total = (data as { total?: unknown }).total;
    if (typeof total === "number") return total;
  }
  return fallback;
}

function asOwner(raw: unknown): PlatformWorkspaceOwner | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const userId = pickStr(rec.userId, rec.id);
  if (!userId) return null;
  return {
    userId,
    email: pickStr(rec.email),
    name: pickStr(rec.name) || null,
  };
}

function asWorkspace(raw: unknown): PlatformWorkspace | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const id = pickStr(rec.id);
  if (!id) return null;
  const owners = Array.isArray(rec.owners)
    ? rec.owners.map(asOwner).filter((o): o is PlatformWorkspaceOwner => !!o)
    : [];
  const counts =
    rec.recordCounts && typeof rec.recordCounts === "object"
      ? (rec.recordCounts as Record<string, number>)
      : undefined;
  return {
    id,
    name: pickStr(rec.name) || "Workspace",
    slug: pickStr(rec.slug),
    status: pickStr(rec.status) || "ACTIVE",
    plan: pickStr(rec.plan) || "FREE",
    memberCount: pickNum(rec.memberCount),
    owners,
    trialEndsAt: toIsoOrNull(rec.trialEndsAt),
    createdAt: toIso(rec.createdAt),
    updatedAt: toIso(rec.updatedAt),
    deletedAt: toIsoOrNull(rec.deletedAt),
    recordCounts: counts,
  };
}

function asUser(raw: unknown): PlatformUser | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const id = pickStr(rec.id);
  if (!id) return null;
  return {
    id,
    email: pickStr(rec.email),
    userName: pickStr(rec.userName, rec.username),
    name: pickStr(rec.name) || null,
    globalRole: pickStr(rec.globalRole, rec.role) || "USER",
    isVerified: rec.isVerified === true,
    workspaceCount: pickNum(rec.workspaceCount),
    createdAt: toIso(rec.createdAt),
    deletedAt: toIsoOrNull(rec.deletedAt),
  };
}

function asMember(raw: unknown): PlatformWorkspaceMember | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const userId = pickStr(rec.userId);
  if (!userId) return null;
  return {
    membershipId: pickStr(rec.membershipId, rec.id),
    userId,
    email: pickStr(rec.email),
    name: pickStr(rec.name) || null,
    role: pickStr(rec.role) || "MEMBER",
    isActive: rec.isActive !== false,
    joinedAt: toIsoOrNull(rec.joinedAt),
  };
}

function asStats(raw: unknown): PlatformStats {
  const rec =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const byPlan =
    rec.workspacesByPlan && typeof rec.workspacesByPlan === "object"
      ? (rec.workspacesByPlan as Record<string, number>)
      : {};
  return {
    totalWorkspaces: pickNum(rec.totalWorkspaces),
    activeWorkspaces: pickNum(rec.activeWorkspaces),
    suspendedWorkspaces: pickNum(rec.suspendedWorkspaces),
    cancelledWorkspaces: pickNum(rec.cancelledWorkspaces),
    deletedWorkspaces: pickNum(rec.deletedWorkspaces),
    totalUsers: pickNum(rec.totalUsers),
    superAdmins: pickNum(rec.superAdmins),
    workspacesByPlan: byPlan,
  };
}

export function platformStatsPath() {
  return "/v1/platform/stats";
}

export function platformUsersPath(suffix = "") {
  return `/v1/platform/users${suffix}`;
}

export function platformWorkspacesPath(suffix = "") {
  return `/v1/platform/workspaces${suffix}`;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return asStats(await crmWorkspaceFetch<unknown>(platformStatsPath()));
}

export async function listPlatformUsers(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    globalRole?: PlatformGlobalRole | string;
    workspaceId?: string;
    includeDeleted?: boolean;
  } = {},
): Promise<PlatformPage<PlatformUser>> {
  const data = await crmWorkspaceFetch<unknown>(
    `${platformUsersPath()}${toQuery({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search?.trim(),
      globalRole: query.globalRole,
      workspaceId: query.workspaceId,
      includeDeleted: query.includeDeleted ? true : undefined,
    })}`,
  );
  const items = extractList(data)
    .map(asUser)
    .filter((row): row is PlatformUser => !!row);
  return {
    items,
    total: extractTotal(data, items.length),
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  };
}

export async function setPlatformUserGlobalRole(
  userId: string,
  globalRole: PlatformGlobalRole | string,
): Promise<PlatformUser> {
  const data = await crmWorkspaceFetch<unknown>(
    platformUsersPath(`/${userId}/global-role`),
    {
      method: "PATCH",
      body: JSON.stringify({ globalRole }),
    },
  );
  const user = asUser(data);
  if (!user) throw new Error("CRM did not return the updated user");
  return user;
}

export async function listPlatformWorkspaces(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: PlatformWorkspaceStatus | string;
    plan?: PlatformWorkspacePlan | string;
    includeDeleted?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<PlatformPage<PlatformWorkspace>> {
  const data = await crmWorkspaceFetch<unknown>(
    `${platformWorkspacesPath()}${toQuery({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search?.trim(),
      status: query.status,
      plan: query.plan,
      includeDeleted: query.includeDeleted ? true : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    })}`,
  );
  const items = extractList(data)
    .map(asWorkspace)
    .filter((row): row is PlatformWorkspace => !!row);
  return {
    items,
    total: extractTotal(data, items.length),
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  };
}

export async function getPlatformWorkspace(
  workspaceId: string,
): Promise<PlatformWorkspace> {
  const data = await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}`),
  );
  const row = asWorkspace(data);
  if (!row) throw new Error("Workspace not found");
  return row;
}

export async function updatePlatformWorkspace(
  workspaceId: string,
  patch: {
    name?: string;
    slug?: string;
    plan?: PlatformWorkspacePlan | string;
    status?: PlatformWorkspaceStatus | string;
  },
): Promise<PlatformWorkspace> {
  const data = await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}`),
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const row = asWorkspace(data);
  if (!row) throw new Error("CRM did not return the updated workspace");
  return row;
}

export async function deletePlatformWorkspace(
  workspaceId: string,
): Promise<void> {
  await crmWorkspaceFetch<unknown>(platformWorkspacesPath(`/${workspaceId}`), {
    method: "DELETE",
  });
}

export async function suspendPlatformWorkspace(
  workspaceId: string,
): Promise<PlatformWorkspace> {
  const data = await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}/suspend`),
    { method: "POST" },
  );
  const row = asWorkspace(data);
  if (!row) throw new Error("CRM did not return the suspended workspace");
  return row;
}

export async function activatePlatformWorkspace(
  workspaceId: string,
): Promise<PlatformWorkspace> {
  const data = await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}/activate`),
    { method: "POST" },
  );
  const row = asWorkspace(data);
  if (!row) throw new Error("CRM did not return the activated workspace");
  return row;
}

export async function restorePlatformWorkspace(
  workspaceId: string,
): Promise<PlatformWorkspace> {
  const data = await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}/restore`),
    { method: "POST" },
  );
  const row = asWorkspace(data);
  if (!row) throw new Error("CRM did not return the restored workspace");
  return row;
}

export async function listPlatformWorkspaceMembers(
  workspaceId: string,
): Promise<PlatformWorkspaceMember[]> {
  const data = await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}/members`),
  );
  return extractList(data)
    .map(asMember)
    .filter((row): row is PlatformWorkspaceMember => !!row);
}

export async function setPlatformWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: PlatformWorkspaceRole | string,
): Promise<PlatformWorkspaceMember> {
  const data = await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}/members/${userId}`),
    {
      method: "PUT",
      body: JSON.stringify({ role }),
    },
  );
  const row = asMember(data);
  if (!row) throw new Error("CRM did not return the membership");
  return row;
}

export async function removePlatformWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await crmWorkspaceFetch<unknown>(
    platformWorkspacesPath(`/${workspaceId}/members/${userId}`),
    { method: "DELETE" },
  );
}
