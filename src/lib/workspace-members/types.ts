/** Workspace members — GET/POST/PATCH/DELETE under /v1/workspaces/{id}/members */

import type { HierarchyLevel } from "@/lib/rules/permissions";

export type WorkspaceMemberStatus = "Active" | "Invited" | "Inactive";

export type WorkspaceMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: HierarchyLevel;
  status: WorkspaceMemberStatus;
  isOwner: boolean;
  team?: string;
  joinedAt?: string;
};

export type WorkspaceMembersSummary = {
  joined: number;
  pending: number;
  byRole: Record<string, number>;
};

const STORE_KEY = "workspace-members:v1";

/**
 * Local-only placeholder used the same way as `settings/users-store.ts`'s
 * SEED — an instant first paint / offline fallback before
 * `replaceCrmWorkspaceMembers()` overwrites this store with the real
 * members fetched from the CRM API. Never what a real workspace's members
 * list actually shows once that fetch resolves.
 */
const SEED: WorkspaceMember[] = [];

function readStore(): WorkspaceMember[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceMember[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: WorkspaceMember[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listWorkspaceMembers(): WorkspaceMember[] {
  return readStore() ?? SEED.map((row) => ({ ...row }));
}

export function upsertWorkspaceMember(row: WorkspaceMember) {
  const list = listWorkspaceMembers();
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = row;
  else list.unshift(row);
  writeStore(list);
  return row;
}

export function replaceCrmWorkspaceMembers(remote: WorkspaceMember[]) {
  writeStore(remote.map((row) => ({ ...row })));
}

export function deleteWorkspaceMember(id: string) {
  writeStore(listWorkspaceMembers().filter((row) => row.id !== id));
}

export function emptyWorkspaceMembersSummary(): WorkspaceMembersSummary {
  return { joined: 0, pending: 0, byRole: {} };
}
