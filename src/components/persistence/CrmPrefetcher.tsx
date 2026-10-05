"use client";

import { useEffect } from "react";

import {
  decodeJwtPayload,
  ensureCrmSession,
  refreshCrmSession,
  rememberedWorkspaceId,
} from "@/lib/activity-timeline/auth";
import { readStoredCrmTokens } from "@/lib/auth/browser-session-cache";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import { startRoutePrefetch } from "@/lib/crm/route-prefetch";

/** How long before the access token expires it is replaced. */
const REFRESH_AHEAD_MS = 60_000;
const HOVER_INTENT_MS = 80;

function accessTokenExpiry(): number | null {
  const token = readStoredCrmTokens().accessToken?.trim();
  if (!token) return null;
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
}

function linkPathname(target: EventTarget | null): string | null {
  const link = (target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return null;
  try {
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === window.location.pathname) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

/**
 * Cuts the waits between the dashboard and the CRM:
 *
 * - fetches a page's data when a link to it is hovered or focused, and warms
 *   the most recently used pages once the browser is idle;
 * - replaces the access token a minute before it expires, so requests do not
 *   each hit a 401, refresh and retry.
 */
export function CrmPrefetcher() {
  useEffect(() => {
    const prefetcher = startRoutePrefetch({
      workspaceId: rememberedWorkspaceId,
      run: async (transport, path) => {
        if (transport === "bff") {
          return crmBffFetch(path, undefined, { recordForPrefetch: false });
        }
        const session = await ensureCrmSession();
        if (!session || transport !== `direct ${session.baseUrl}`) return null;
        return crmFetch(session, path, undefined, { recordForPrefetch: false });
      },
    });

    let hoverTimer: number | undefined;
    const onPointerOver = (event: PointerEvent) => {
      const pathname = linkPathname(event.target);
      window.clearTimeout(hoverTimer);
      if (!pathname) return;
      hoverTimer = window.setTimeout(() => prefetcher.prefetch(pathname), HOVER_INTENT_MS);
    };
    const onIntent = (event: Event) => {
      const pathname = linkPathname(event.target);
      if (pathname) prefetcher.prefetch(pathname);
    };
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });

    // Once the page has settled, warm the pages used most recently.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = (cb: () => void) =>
      hasIdle ? window.requestIdleCallback(cb, { timeout: 4000 }) : window.setTimeout(cb, 2500);
    const idleId = idle(() => {
      for (const route of prefetcher.recentRoutes(3, window.location.pathname)) {
        prefetcher.prefetch(route);
      }
    });

    // Refresh the access token ahead of expiry instead of after a 401.
    let refreshTimer: number | undefined;
    let stopped = false;
    const schedule = () => {
      window.clearTimeout(refreshTimer);
      if (stopped) return;
      const expiry = accessTokenExpiry();
      if (!expiry) return;
      const wait = Math.max(5_000, expiry - Date.now() - REFRESH_AHEAD_MS);
      refreshTimer = window.setTimeout(async () => {
        await refreshCrmSession().catch(() => null);
        schedule();
      }, wait);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const expiry = accessTokenExpiry();
      // Timers are throttled in background tabs; catch up on return.
      if (expiry && expiry - Date.now() < REFRESH_AHEAD_MS) {
        void refreshCrmSession()
          .catch(() => null)
          .finally(schedule);
      } else {
        schedule();
      }
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      prefetcher.stop();
      window.clearTimeout(hoverTimer);
      window.clearTimeout(refreshTimer);
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
