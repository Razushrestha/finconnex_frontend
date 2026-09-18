/**
 * Phase 14 — client auth → persistence cutover bridge.
 * Uses /api/auth/me + /api/auth/crm-token (httpOnly cookie → Bearer).
 */

import { fetchAuthMeJson, fetchCrmTokenJson } from "@/lib/auth/browser-session-cache";

export type AuthBridgeSnapshot = {
  authenticated: boolean;
  tenantId: string;
  tenantSlug?: string;
  accessToken: string | null;
  userName?: string;
};

export type FetchAuthBridgeOptions = {
  fetchImpl?: typeof fetch;
  meUrl?: string;
  tokenUrl?: string;
};

const DEFAULT_ME = "/api/auth/me";
const DEFAULT_TOKEN = "/api/auth/crm-token";

function readStoredAccessToken() {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem("fc.crm.accessToken") ||
      window.localStorage.getItem("fc.crm.accessToken")
    );
  } catch {
    return null;
  }
}

/**
 * Resolve tenant + access token for bootstrapPersistence / module hydrate.
 * Unauthenticated → demo tenant, null token (session driver still fine).
 */
export async function fetchAuthBridge(
  options: FetchAuthBridgeOptions = {},
): Promise<AuthBridgeSnapshot> {
  const meUrl = options.meUrl ?? DEFAULT_ME;
  const tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN;

  try {
    const storedToken = readStoredAccessToken();

    const me = options.fetchImpl
      ? await options
          .fetchImpl(meUrl, { credentials: "same-origin" })
          .then(async (meRes) => {
            if (!meRes.ok) return null;
            return (await meRes.json()) as {
              authenticated?: boolean;
              tenant?: { id?: string; slug?: string };
              user?: { name?: string };
            };
          })
      : ((await fetchAuthMeJson()) as {
          authenticated?: boolean;
          tenant?: { id?: string; slug?: string };
          user?: { name?: string };
        });

    if (!me?.authenticated || !me.tenant?.id) {
      return { authenticated: false, tenantId: "demo", accessToken: null };
    }

    let accessToken: string | null =
      typeof storedToken === "string" && storedToken.trim()
        ? storedToken.trim()
        : null;
    if (!accessToken) {
      try {
        const tok = options.fetchImpl
          ? await options
              .fetchImpl(tokenUrl, { credentials: "same-origin" })
              .then(async (tokRes) =>
                tokRes.ok
                  ? ((await tokRes.json()) as { accessToken?: string | null })
                  : null,
              )
          : await fetchCrmTokenJson();
        accessToken =
          typeof tok?.accessToken === "string" ? tok.accessToken : null;
      } catch {
        /* token optional when CRM URL unset */
      }
    }

    return {
      authenticated: true,
      tenantId: me.tenant.id,
      tenantSlug: me.tenant.slug,
      accessToken,
      userName: me.user?.name,
    };
  } catch {
    return { authenticated: false, tenantId: "demo", accessToken: null };
  }
}
