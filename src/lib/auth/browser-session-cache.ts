type CacheEntry = { at: number; data: Record<string, unknown> };

const TTL_MS = 4_000;

let meCache: CacheEntry | null = null;
let meInflight: Promise<Record<string, unknown>> | null = null;
let tokenCache: CacheEntry | null = null;
let tokenInflight: Promise<Record<string, unknown>> | null = null;

async function load(
  url: string,
  cache: CacheEntry | null,
  getInflight: () => Promise<Record<string, unknown>> | null,
  setInflight: (p: Promise<Record<string, unknown>> | null) => void,
  setCache: (entry: CacheEntry | null, data: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const existing = getInflight();
  if (existing) return existing;
  const next = fetch(url, { credentials: "same-origin" })
    .then(async (res) => {
      const data = ((await res.json().catch(() => ({}))) ?? {}) as Record<
        string,
        unknown
      >;
      setCache(cache, data);
      return data;
    })
    .finally(() => setInflight(null));
  setInflight(next);
  return next;
}

export function readStoredCrmTokens() {
  if (typeof window === "undefined") {
    return { accessToken: null as string | null, refreshToken: null as string | null };
  }
  try {
    return {
      accessToken:
        window.sessionStorage.getItem("fc.crm.accessToken") ||
        window.localStorage.getItem("fc.crm.accessToken"),
      refreshToken:
        window.sessionStorage.getItem("fc.crm.refreshToken") ||
        window.localStorage.getItem("fc.crm.refreshToken"),
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function hasAccessToken(data: Record<string, unknown>) {
  return typeof data.accessToken === "string" && data.accessToken.trim().length > 0;
}

export function fetchAuthMeJson() {
  return load(
    "/api/auth/me",
    meCache,
    () => meInflight,
    (p) => {
      meInflight = p;
    },
    (_prev, data) => {
      meCache = { at: Date.now(), data };
    },
  );
}

export function fetchCrmTokenJson() {
  return load(
    "/api/auth/crm-token",
    tokenCache,
    () => tokenInflight,
    (p) => {
      tokenInflight = p;
    },
    (_prev, data) => {
      // Empty cookie-bridge responses must not block a POST re-seed.
      tokenCache = hasAccessToken(data) ? { at: Date.now(), data } : null;
    },
  );
}

/** Rotate/re-seed from localStorage. CRM access JWTs often do not fit in cookies. */
export async function refreshCrmTokenFromBrowser(): Promise<Record<string, unknown>> {
  tokenCache = null;
  const stored = readStoredCrmTokens();
  const res = await fetch("/api/auth/crm-token", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken: stored.accessToken || undefined,
      refreshToken: stored.refreshToken || undefined,
    }),
  });
  const data = ((await res.json().catch(() => ({}))) ?? {}) as Record<
    string,
    unknown
  >;
  if (hasAccessToken(data)) {
    tokenCache = { at: Date.now(), data };
  }
  return data;
}

export function invalidateBrowserSessionCache() {
  meCache = null;
  tokenCache = null;
  meInflight = null;
  tokenInflight = null;
}
