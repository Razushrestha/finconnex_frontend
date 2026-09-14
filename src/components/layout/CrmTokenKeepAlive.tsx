"use client";

import { useEffect } from "react";
import { persistCrmTokens } from "@/lib/activity-timeline/auth";

const MIN_WAIT_MS = 15_000;
const REFRESH_EARLY_MS = 60_000;
const ACCESS_KEY = "fc.crm.accessToken";
const REFRESH_KEY = "fc.crm.refreshToken";

type TokenPayload = {
  authenticated?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  error?: string;
};

function readStoredTokens() {
  if (typeof window === "undefined") {
    return { accessToken: null as string | null, refreshToken: null as string | null };
  }
  try {
    return {
      accessToken:
        window.sessionStorage.getItem(ACCESS_KEY) ||
        window.localStorage.getItem(ACCESS_KEY),
      refreshToken:
        window.sessionStorage.getItem(REFRESH_KEY) ||
        window.localStorage.getItem(REFRESH_KEY),
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

async function syncCrmTokens(): Promise<number> {
  const res = await fetch("/api/auth/crm-token", { credentials: "same-origin" });
  if (res.status === 401) return MIN_WAIT_MS;
  if (!res.ok) return MIN_WAIT_MS;
  let json = (await res.json()) as TokenPayload;
  if (json.authenticated === false) {
    return MIN_WAIT_MS;
  }

  // Cookie jar may not hold the access JWT on Vercel — re-seed from localStorage.
  if (!json.accessToken) {
    const stored = readStoredTokens();
    if (stored.accessToken || stored.refreshToken) {
      const seeded = await fetch("/api/auth/crm-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stored),
      });
      if (seeded.ok) {
        json = (await seeded.json()) as TokenPayload;
      }
    }
  }

  if (json.accessToken) {
    persistCrmTokens({
      accessToken: json.accessToken,
      refreshToken: json.refreshToken,
    });
  }
  const expiresMs = (json.expiresIn ?? 0) * 1000;
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

    void loop();
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
