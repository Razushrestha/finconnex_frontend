/**
 * Learns which CRM GETs each dashboard page makes, then fetches them ahead of
 * time when a link to that page is hovered or focused (and, when the browser
 * is idle, for the pages visited most recently). The requests land in the GET
 * cache, so the page opens with its data already loaded.
 *
 * Only list-style pages are learned, and only requests scoped to the whole
 * workspace: a path naming one record would prefetch the wrong record for a
 * different link, and a search depends on what is typed.
 */
import { setCrmGetListener, hasFreshCrmGet } from "@/lib/crm/get-cache";

const STORE_KEY = "fc:route-prefetch:v1";
const MAX_ROUTES = 40;
const MAX_PATHS = 10;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const HAS_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const VOLATILE_QUERY = /[?&](search|q|query|cursor|before|after)=/i;

type Learned = { t: string; p: string };
type Store = Record<string, { at: number; paths: Learned[] }>;

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    const routes = Object.entries(store)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MAX_ROUTES);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(routes)));
  } catch {
    /* storage full or blocked: prefetch is only an optimisation */
  }
}

/** The page key for a URL path, or null for pages about one record. */
export function routeKey(pathname: string): string | null {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (HAS_UUID.test(clean) || /\/\d+(\/|$)/.test(clean)) return null;
  return clean;
}

/** Whether a learned request is safe to replay for any visit to its page. */
export function isPrefetchablePath(path: string, workspaceId: string | null): boolean {
  if (!path.startsWith("/v1/") || VOLATILE_QUERY.test(path)) return false;
  const ids = path.match(UUID) ?? [];
  return ids.every((id) => workspaceId && id.toLowerCase() === workspaceId.toLowerCase());
}

let workspaceOf: () => string | null = () => null;

function learn(transport: string, path: string) {
  if (typeof window === "undefined") return;
  const key = routeKey(window.location.pathname);
  if (!key || !isPrefetchablePath(path, workspaceOf())) return;
  const store = readStore();
  const entry = store[key] ?? { at: 0, paths: [] };
  const paths = entry.paths.filter((row) => !(row.t === transport && row.p === path));
  paths.unshift({ t: transport, p: path });
  store[key] = { at: Date.now(), paths: paths.slice(0, MAX_PATHS) };
  writeStore(store);
}

export type PrefetchRunner = (transport: string, path: string) => Promise<unknown>;

/** Starts learning; returns a function that prefetches a page's requests. */
export function startRoutePrefetch(opts: {
  workspaceId: () => string | null;
  run: PrefetchRunner;
}) {
  workspaceOf = opts.workspaceId;
  setCrmGetListener(learn);
  const lastRun = new Map<string, number>();

  function prefetch(pathname: string) {
    const key = routeKey(pathname);
    if (!key) return;
    const at = lastRun.get(key) ?? 0;
    if (Date.now() - at < 30_000) return;
    lastRun.set(key, Date.now());
    const entry = readStore()[key];
    const workspaceId = opts.workspaceId();
    for (const row of entry?.paths ?? []) {
      if (!isPrefetchablePath(row.p, workspaceId)) continue;
      if (hasFreshCrmGet(row.t, row.p)) continue;
      void opts.run(row.t, row.p).catch(() => undefined);
    }
  }

  /** The most recently visited pages, newest first, for idle warm-up. */
  function recentRoutes(limit: number, except: string): string[] {
    const current = routeKey(except);
    return Object.entries(readStore())
      .sort((a, b) => b[1].at - a[1].at)
      .map(([route]) => route)
      .filter((route) => route !== current)
      .slice(0, limit);
  }

  return {
    prefetch,
    recentRoutes,
    stop() {
      setCrmGetListener(null);
    },
  };
}
