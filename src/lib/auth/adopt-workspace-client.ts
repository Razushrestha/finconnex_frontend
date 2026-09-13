"use client";

import {
  clearCrmTokens,
  persistCrmTokens,
  workspaceIdFromToken,
} from "@/lib/activity-timeline/auth";
import { setTenantContext } from "@/lib/persistence/tenant";

/** Browser caches that are not tenant-prefixed and would leak CRM rows. */
export const CRM_WORKSPACE_OVERLAY_KEYS = [
  "finconnex.leads.board.backup.v1",
  "finconnex.tasks.board.backup.v1",
  "finconnex.calls.board.backup.v1",
  "finconnex.leads.identity.v1",
  "finconnex.work-queue.person-tabs",
  "finconnex:workqueue:categories:v3",
] as const;

function removeKey(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    /* private mode */
  }
}

/** Drop unscoped CRM overlays so a new workspace cannot inherit the last tenant. */
export function clearCrmWorkspaceOverlays() {
  if (typeof window === "undefined") return;
  for (const key of CRM_WORKSPACE_OVERLAY_KEYS) {
    removeKey(window.sessionStorage, key);
    removeKey(window.localStorage, key);
  }
}

/**
 * After cookies are reminted for a workspace, replace the browser JWT and
 * local CRM overlays so lists cannot keep serving the previous tenant.
 */
export async function adoptCrmWorkspaceClient(workspaceId?: string | null) {
  clearCrmTokens();
  clearCrmWorkspaceOverlays();

  const hinted = workspaceId?.trim() || null;
  if (hinted) setTenantContext({ tenantId: hinted });

  try {
    const res = await fetch("/api/auth/crm-token", {
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const json = (await res.json()) as {
      accessToken?: string | null;
      refreshToken?: string | null;
      workspaceId?: string | null;
      tenantId?: string | null;
    };
    if (!json.accessToken) return;
    const fromJwt = workspaceIdFromToken(json.accessToken);
    const nextId =
      fromJwt ||
      hinted ||
      json.workspaceId?.trim() ||
      json.tenantId?.trim() ||
      null;
    persistCrmTokens({
      accessToken: json.accessToken,
      refreshToken: json.refreshToken,
      workspaceId: nextId,
    });
    if (nextId) setTenantContext({ tenantId: nextId });
  } catch {
    /* navigation still proceeds with cookies */
  }
}
