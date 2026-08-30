/** Local (session) Auth API: proxies existing Next auth routes */

import type { AuthApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import type { SessionPayload } from "@/lib/auth/types";

export const localAuthApi: AuthApi = {
  async login(input) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.username,
          password: input.password,
          rememberMe: input.rememberMe,
        }),
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
        // login route may set cookie only: hydrate via me()
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
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      return apiOk({ ok: true as const });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async logoutAll() {
    try {
      const res = await fetch("/api/auth/logout-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: body.error ?? "Logout all failed",
          }),
        );
      }
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

  async listSessions() {
    try {
      const res = await fetch("/api/auth/sessions", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        sessions?: Array<{
          id: string;
          createdAt: string;
          lastUsedAt: string;
          expiresAt: string;
          ipHash: string;
          userAgent?: string;
          current: boolean;
        }>;
        error?: string;
      };
      if (!res.ok) {
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: data.error ?? "Could not list sessions",
          }),
        );
      }
      return apiOk({ sessions: data.sessions ?? [] });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async revokeSession(id: string) {
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: body.error ?? "Could not revoke session",
          }),
        );
      }
      return apiOk({ ok: true as const });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async forgotPassword(email: string) {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: body.error ?? "Could not request password reset",
          }),
        );
      }
      return apiOk({ ok: true as const });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async resetPassword(input: { token: string; password: string }) {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: input.token,
          password: input.password,
          confirmPassword: input.password,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: body.error ?? "Could not reset password",
          }),
        );
      }
      return apiOk({ ok: true as const });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async resendEmailVerification(email: string) {
    try {
      const res = await fetch("/api/auth/email-verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: body.error ?? "Could not resend verification",
          }),
        );
      }
      return apiOk({ ok: true as const });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async verifyEmail(token: string) {
    try {
      const res = await fetch("/api/auth/email-verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: body.error ?? "Could not verify email",
          }),
        );
      }
      return apiOk({ ok: true as const });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async selectWorkspace(workspaceId: string) {
    try {
      const res = await fetch("/api/auth/workspace", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return apiFail(
          new ApiError(res.status, {
            code: "INTERNAL",
            message: body.error ?? "Could not select workspace",
          }),
        );
      }
      return apiOk({ workspaceId });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
