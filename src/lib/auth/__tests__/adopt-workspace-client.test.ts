import { beforeEach, describe, expect, it, vi } from "vitest";
import { installSmokePolyfill } from "@/lib/leads/smoke-polyfill";
import {
  adoptCrmWorkspaceClient,
  clearCrmWorkspaceOverlays,
  CRM_WORKSPACE_OVERLAY_KEYS,
} from "@/lib/auth/adopt-workspace-client";
import {
  persistCrmTokens,
  workspaceIdFromToken,
} from "@/lib/activity-timeline/auth";
import {
  CRM_WORKSPACE_STORAGE_KEY,
  getTenantContext,
  setTenantContext,
} from "@/lib/persistence/tenant";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: () => null as string | null,
    get length() {
      return map.size;
    },
  };
}

function jwtWithWorkspace(workspaceId: string) {
  const payload = Buffer.from(JSON.stringify({ workspaceId, exp: 2e9 }))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eyJhbGciOiJub25lIn0.${payload}.x`;
}

describe("workspace client adopt", () => {
  beforeEach(() => {
    installSmokePolyfill();
    if (typeof globalThis.localStorage === "undefined") {
      Object.defineProperty(globalThis, "localStorage", {
        value: memoryStorage(),
        configurable: true,
      });
    }
    setTenantContext(null);
    sessionStorage.clear();
    localStorage.clear();
  });

  it("persists workspaceId from the access JWT", () => {
    const accessToken = jwtWithWorkspace("ws-b");
    persistCrmTokens({ accessToken });
    expect(workspaceIdFromToken(accessToken)).toBe("ws-b");
    expect(sessionStorage.getItem(CRM_WORKSPACE_STORAGE_KEY)).toBe("ws-b");
    expect(getTenantContext().tenantId).toBe("ws-b");
  });

  it("drops unscoped CRM overlays", () => {
    for (const key of CRM_WORKSPACE_OVERLAY_KEYS) {
      localStorage.setItem(key, "leak");
      sessionStorage.setItem(key, "leak");
    }
    clearCrmWorkspaceOverlays();
    for (const key of CRM_WORKSPACE_OVERLAY_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
  });

  it("replaces the stored JWT after cookies remint", async () => {
    persistCrmTokens({
      accessToken: jwtWithWorkspace("ws-a"),
      workspaceId: "ws-a",
    });
    localStorage.setItem("finconnex.leads.board.backup.v1", "old-board");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: jwtWithWorkspace("ws-b"),
          refreshToken: "r2",
          workspaceId: "ws-b",
        }),
      })),
    );

    await adoptCrmWorkspaceClient("ws-b");

    expect(sessionStorage.getItem(CRM_WORKSPACE_STORAGE_KEY)).toBe("ws-b");
    expect(localStorage.getItem("finconnex.leads.board.backup.v1")).toBeNull();
    expect(getTenantContext().tenantId).toBe("ws-b");
    vi.unstubAllGlobals();
  });
});
