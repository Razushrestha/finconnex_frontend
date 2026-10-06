/**
 * Short-lived cache for CRM GET requests in the browser.
 *
 * Every module page used to refetch everything it shows on each visit, and a
 * header's status dot stayed red until that round trip finished. With this:
 *
 * - identical GETs in flight at the same moment share one request;
 * - a GET repeated within FRESH_MS (a page revisit, or a prefetch followed by
 *   the click) is answered from memory without touching the network;
 * - any write (POST/PATCH/PUT/DELETE) clears the cache, so a page never shows
 *   data from before an edit it just made.
 *
 * Server-side code never caches: a Node process serves many users.
 */

const FRESH_MS = 60_000;
const MAX_ENTRIES = 200;

type Entry = { at: number; promise: Promise<unknown> };

const entries = new Map<string, Entry>();

type GetListener = (transport: string, path: string) => void;
let onNetworkGet: GetListener | null = null;

/**
 * Off under test runners: suites call the same GET in consecutive tests and
 * expect the network each time. The cache's own tests switch it on.
 */
let enabledForTests: boolean | null = null;

function inBrowser() {
  if (enabledForTests !== null) return enabledForTests && typeof window !== "undefined";
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") return false;
  return typeof window !== "undefined";
}

/** Test hook: true/false forces the cache on/off; null restores the default. */
export function setCrmGetCacheForTests(enabled: boolean | null): void {
  enabledForTests = enabled;
  entries.clear();
}

export function isCacheableGet(init?: RequestInit): boolean {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET" || init?.body) return false;
  return init?.cache !== "no-store" && init?.cache !== "reload";
}

function copy<T>(value: T): T {
  // Callers own what they get back; never hand two of them the same object.
  if (value === null || typeof value !== "object") return value;
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

/**
 * Runs `load` unless an identical GET finished within FRESH_MS or is still in
 * flight, in which case that result is reused.
 */
export function cachedCrmGet<T>(
  transport: string,
  path: string,
  load: () => Promise<T>,
  opts: { record?: boolean } = {},
): Promise<T> {
  if (!inBrowser()) return load();
  const key = `${transport} ${path}`;
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) {
    return hit.promise.then((value) => copy(value as T));
  }

  if (opts.record !== false) onNetworkGet?.(transport, path);
  const promise = load();
  entries.set(key, { at: Date.now(), promise });
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
  promise.catch(() => {
    // A failed request must not be served to the next caller.
    if (entries.get(key)?.promise === promise) entries.delete(key);
  });
  return promise.then((value) => copy(value));
}

/** True when a fresh answer for this GET is already in memory or in flight. */
export function hasFreshCrmGet(transport: string, path: string): boolean {
  const hit = entries.get(`${transport} ${path}`);
  return Boolean(hit && Date.now() - hit.at < FRESH_MS);
}

/** Called for every write and on sign-out. */
export function invalidateCrmGetCache(): void {
  entries.clear();
}

/** Lets the route prefetcher learn which GETs each page makes. */
export function setCrmGetListener(listener: GetListener | null): void {
  onNetworkGet = listener;
}
