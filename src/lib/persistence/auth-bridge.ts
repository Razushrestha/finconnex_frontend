/**
 * Phase 14 — client auth → persistence cutover bridge.
 * Uses /api/auth/me + /api/auth/crm-token (httpOnly cookie → Bearer).
 */

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

/**
 * Resolve tenant + access token for bootstrapPersistence / module hydrate.
 * Unauthenticated → demo tenant, null token (session driver still fine).
 */
export async function fetchAuthBridge(
  options: FetchAuthBridgeOptions = {},
): Promise<AuthBridgeSnapshot> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const meUrl = options.meUrl ?? DEFAULT_ME;
  const tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN;

  try {
    const meRes = await fetchImpl(meUrl, { credentials: "same-origin" });
    if (!meRes.ok) {
      return { authenticated: false, tenantId: "demo", accessToken: null };
    }
    const me = (await meRes.json()) as {
      authenticated?: boolean;
      tenant?: { id?: string; slug?: string };
      user?: { name?: string };
    };
    if (!me.authenticated || !me.tenant?.id) {
      return { authenticated: false, tenantId: "demo", accessToken: null };
    }

    let accessToken: string | null = null;
    try {
      const tokRes = await fetchImpl(tokenUrl, { credentials: "same-origin" });
      if (tokRes.ok) {
        const tok = (await tokRes.json()) as { accessToken?: string | null };
        accessToken =
          typeof tok.accessToken === "string" ? tok.accessToken : null;
      }
    } catch {
      /* token optional when CRM URL unset */
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
