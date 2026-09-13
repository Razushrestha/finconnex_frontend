/**
 * Workspace backups — /v1/workspace-backups
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";

export type CrmWorkspaceBackup = {
  id: string;
  status: string;
  sizeBytes: number | null;
  createdAt: string;
  payload?: unknown;
};

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to manage backups");
  if (isBoundCrmSession()) return crmFetch(scoped, path, init);
  return crmBffFetch(path, init);
}

function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec.items)) return rec.items as Record<string, unknown>[];
    if (Array.isArray(rec.data)) return rec.data as Record<string, unknown>[];
  }
  return [];
}

function normalize(raw: Record<string, unknown>): CrmWorkspaceBackup {
  const size = raw.sizeBytes ?? raw.size;
  return {
    id: String(raw.id ?? ""),
    status: String(raw.status ?? "UNKNOWN"),
    sizeBytes: typeof size === "number" ? size : null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    payload: raw.payload,
  };
}

export async function listCrmWorkspaceBackups(): Promise<CrmWorkspaceBackup[]> {
  const data = await call("/v1/workspace-backups?limit=50");
  return asRows(data)
    .map(normalize)
    .filter((row) => row.id);
}

export async function requestCrmWorkspaceBackup(): Promise<CrmWorkspaceBackup> {
  const data = await call("/v1/workspace-backups", { method: "POST" });
  const rec =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return normalize(rec);
}

export async function getCrmWorkspaceBackup(
  id: string,
): Promise<CrmWorkspaceBackup> {
  const data = await call(`/v1/workspace-backups/${encodeURIComponent(id)}`);
  const rec =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return normalize(rec);
}

export async function restoreCrmWorkspaceBackup(
  id: string,
): Promise<unknown> {
  return call(`/v1/workspace-backups/${encodeURIComponent(id)}/restore`, {
    method: "POST",
  });
}

export async function tryCrmWorkspaceBackups<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
