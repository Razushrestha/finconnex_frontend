import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import {
  upsertStoredWorkspace,
  type CrmWorkspaceRecord,
} from "@/lib/workspaces/types";

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

export function workspacesPath(suffix = ""): string {
  return `/v1/workspaces${suffix}`;
}

export function workspacesMinePath(): string {
  return "/v1/workspaces/mine";
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
    for (const key of ["items", "workspaces", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function normalizeWorkspace(
  row: Record<string, unknown>,
  index = 0,
): CrmWorkspaceRecord {
  return {
    id: pickStr(row.id, row.workspaceId) || `ws-remote-${index}`,
    name: pickStr(row.name, row.workspaceName) || "Workspace",
    slug: pickStr(row.slug),
    status: pickStr(row.status) || "Active",
    plan: pickStr(row.plan, row.planName) || "—",
    memberCount: pickNum(row.memberCount ?? row.members),
    createdAt: pickStr(row.createdAt, row.created_at),
    updatedAt: pickStr(row.updatedAt, row.updated_at),
  };
}

export function normalizeWorkspaces(data: unknown): CrmWorkspaceRecord[] {
  const records = extractRecords(data);
  if (records.length) return records.map((row, i) => normalizeWorkspace(row, i));
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    if (pickStr(rec.id, rec.name)) return [normalizeWorkspace(rec, 0)];
  }
  return [];
}

function asWorkspace(data: unknown): CrmWorkspaceRecord | null {
  return normalizeWorkspaces(data)[0] ?? null;
}

async function workspacesRequest(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage workspaces");
  return crmFetch(auth, path, init);
}

export async function listCrmMyWorkspaces(): Promise<CrmWorkspaceRecord[]> {
  return normalizeWorkspaces(await workspacesRequest(workspacesMinePath()));
}

export async function getCrmWorkspace(
  workspaceId: string,
): Promise<CrmWorkspaceRecord | null> {
  return asWorkspace(await workspacesRequest(workspacesPath(`/${workspaceId}`)));
}

export async function createCrmWorkspace(input: {
  name: string;
  slug?: string;
}): Promise<CrmWorkspaceRecord | null> {
  const slug =
    input.slug?.trim() ||
    input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    `workspace-${Date.now().toString(36)}`;
  return asWorkspace(
    await workspacesRequest(workspacesPath(), {
      method: "POST",
      body: JSON.stringify({
        name: input.name.trim(),
        slug,
      }),
    }),
  );
}

export async function updateCrmWorkspace(
  workspaceId: string,
  patch: { name?: string; slug?: string },
): Promise<CrmWorkspaceRecord | null> {
  const body: Record<string, unknown> = {};
  if (patch.name?.trim()) body.name = patch.name.trim();
  if (patch.slug?.trim()) body.slug = patch.slug.trim();
  return asWorkspace(
    await workspacesRequest(workspacesPath(`/${workspaceId}`), {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmWorkspace(workspaceId: string): Promise<void> {
  await workspacesRequest(workspacesPath(`/${workspaceId}`), {
    method: "DELETE",
  });
}

export async function tryCrmWorkspace<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteWorkspace(row: CrmWorkspaceRecord | null) {
  if (row) upsertStoredWorkspace(row);
  return row;
}
