"use client";

import { useEffect } from "react";
import { persistCrmTokens } from "@/lib/activity-timeline/auth";
import {
  fetchCrmTokenJson,
  readStoredCrmTokens,
  refreshCrmTokenFromBrowser,
} from "@/lib/auth/browser-session-cache";

const MIN_WAIT_MS = 15_000;
const REFRESH_EARLY_MS = 60_000;

type TokenPayload = {
  authenticated?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  error?: string;
};

async function syncCrmTokens(): Promise<number> {
  const stored = readStoredCrmTokens();
  let json = (stored.accessToken || stored.refreshToken
    ? await refreshCrmTokenFromBrowser()
    : await fetchCrmTokenJson()) as TokenPayload;
  if (json.authenticated !== true && !json.accessToken) {
    json = (await fetchCrmTokenJson()) as TokenPayload;
  }

  if (json.accessToken) {
    persistCrmTokens({
      accessToken: json.accessToken,
      refreshToken: json.refreshToken,
    });
  }
  const expiresMs = Number(json.expiresIn ?? 0) * 1000;
  if (expiresMs <= 0) return MIN_WAIT_MS;
  return Math.max(MIN_WAIT_MS, expiresMs - REFRESH_EARLY_MS);
}

/** Keeps the CRM access JWT fresh via the BFF so the browser never races /auth/refresh-token. */
export function CrmTokenKeepAlive() {
  useEffect(() => {
    let timer = 0;
    let cancelled = false;

    const loop = async () => {
      try {
        const wait = await syncCrmTokens();
        if (cancelled) return;
        timer = window.setTimeout(() => {
          void loop();
        }, wait);
      } catch {
        if (cancelled) return;
        timer = window.setTimeout(() => {
          void loop();
        }, MIN_WAIT_MS);
      }
    };

    timer = window.setTimeout(() => {
      void loop();
    }, 8_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void loop();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
