/** Local (session) Auth API — proxies existing Next auth routes */

import type { AuthApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import type { SessionPayload } from "@/lib/auth/types";

export const localAuthApi: AuthApi = {
  async login(input) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        return apiFail(
          new ApiError(res.status, {
            code: res.status === 401 ? "UNAUTHORIZED" : "INTERNAL",
            message: body.error ?? "Login failed",
          }),
        );
      }
      const data = (await res.json()) as { user?: SessionPayload };
      if (!data.user) {
        // login route may set cookie only — hydrate via me()
        const me = await localAuthApi.me();
        if (!me.ok) return me;
        return apiOk({ user: me.data });
      }
      return apiOk({ user: data.user });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      return apiOk({ ok: true as const });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async me() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        return apiFail(
          new ApiError(res.status, {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          }),
        );
      }
      const data = (await res.json()) as {
        user: { id: string; email: string; name: string; role: string };
        tenant: { id: string; slug: string; name: string };
      };
      const session: SessionPayload = {
        userId: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        tenantId: data.tenant.id,
        tenantSlug: data.tenant.slug,
        tenantName: data.tenant.name,
      };
      return apiOk(session);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
