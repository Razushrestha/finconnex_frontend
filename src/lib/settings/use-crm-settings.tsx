"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getCrmSettingsCatalog,
  getCrmWorkspaceCapabilities,
  getCrmWorkspaceSettings,
  getCrmSecuritySettings,
  type CrmCapabilities,
  type CrmSecuritySettings,
  type CrmWorkspaceSettings,
} from "@/lib/settings/api";
import { mirrorOfficeCalendar } from "@/lib/settings/office-calendar";

export type SettingsDataSource = "api" | "demo";

export type CrmSettingsState = {
  source: SettingsDataSource;
  loading: boolean;
  error: string | null;
  settings: CrmWorkspaceSettings | null;
  security: CrmSecuritySettings | null;
  capabilities: CrmCapabilities | null;
  refresh: () => void;
  setSettings: (next: CrmWorkspaceSettings | null) => void;
  setSecurity: (next: CrmSecuritySettings | null) => void;
  setCapabilities: (next: CrmCapabilities | null) => void;
  previewBrand: Partial<Pick<CrmWorkspaceSettings, "primaryColor" | "secondaryColor">> | null;
  setPreviewBrand: (
    next: Partial<Pick<CrmWorkspaceSettings, "primaryColor" | "secondaryColor">> | null,
  ) => void;
};

const SettingsCrmContext = createContext<CrmSettingsState | null>(null);

const SETTINGS_CACHE_KEY = "fc.settings.shell.v1";
const SHELL_TTL_MS = 45_000;

type SettingsCache = {
  settings: CrmWorkspaceSettings | null;
  security: CrmSecuritySettings | null;
  capabilities: CrmCapabilities | null;
};

type ShellBundle = {
  ws: PromiseSettledResult<CrmWorkspaceSettings>;
  sec: PromiseSettledResult<CrmSecuritySettings>;
  caps: PromiseSettledResult<CrmCapabilities>;
};

let shellInflight: Promise<ShellBundle> | null = null;
let shellFetchedAt = 0;

function isNewerRevision(
  prev: CrmWorkspaceSettings | null,
  incoming: CrmWorkspaceSettings,
) {
  return (
    prev?.revision != null &&
    incoming.revision != null &&
    prev.revision > incoming.revision
  );
}

export function invalidateCrmSettingsShell() {
  shellInflight = null;
  shellFetchedAt = 0;
}

function fetchShellSettings(force: boolean) {
  if (
    !force &&
    shellInflight &&
    Date.now() - shellFetchedAt < SHELL_TTL_MS
  ) {
    return shellInflight;
  }
  shellFetchedAt = Date.now();
  shellInflight = Promise.allSettled([
    getCrmWorkspaceSettings(),
    getCrmSecuritySettings(),
    getCrmWorkspaceCapabilities(),
  ]).then(([ws, sec, caps]) => ({ ws, sec, caps }));
  return shellInflight;
}

function readSettingsCache(): SettingsCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SettingsCache;
  } catch {
    return null;
  }
}

function writeSettingsCache(cache: SettingsCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota */
  }
}

function useCrmSettingsState(enabled: boolean): CrmSettingsState {
  // Keep the first render identical on the server and client. Saved brand
  // colours live in sessionStorage and are applied after hydration.
  const [source, setSource] = useState<SettingsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<CrmWorkspaceSettings | null>(null);
  const [security, setSecurity] = useState<CrmSecuritySettings | null>(null);
  const [capabilities, setCapabilities] = useState<CrmCapabilities | null>(null);
  const [previewBrand, setPreviewBrand] = useState<
    Partial<Pick<CrmWorkspaceSettings, "primaryColor" | "secondaryColor">> | null
  >(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const setSettings = useCallback((next: CrmWorkspaceSettings | null) => {
    setSettingsState(next);
    const cached = readSettingsCache();
    writeSettingsCache({
      settings: next,
      security: cached?.security ?? null,
      capabilities: cached?.capabilities ?? null,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const cachedNow = readSettingsCache();
    if (tick === 0 && cachedNow?.settings) {
      setSettingsState(cachedNow.settings);
      setSecurity(cachedNow.security);
      setCapabilities(cachedNow.capabilities);
      setSource("api");
      setLoading(false);
    } else if (!cachedNow?.settings) {
      setLoading(true);
    }
    setError(null);

    const run = async () => {
      const { ws, sec, caps } = await fetchShellSettings(tick > 0);
      if (cancelled) return;

      if (ws.status === "fulfilled") {
        const security =
          sec.status === "fulfilled" ? sec.value : cachedNow?.security ?? null;
        const capabilities =
          caps.status === "fulfilled"
            ? caps.value
            : cachedNow?.capabilities ?? null;
        setSettingsState((prev) => {
          if (isNewerRevision(prev, ws.value)) return prev;
          const next = {
            ...ws.value,
            catalog: {
              ...(prev?.catalog ?? {}),
              ...(ws.value.catalog ?? {}),
            },
          };
          writeSettingsCache({ settings: next, security, capabilities });
          return next;
        });
        setSource("api");
      } else if (!cachedNow?.settings) {
        setSettingsState(null);
        setSource("demo");
        setError(
          ws.reason instanceof Error
            ? ws.reason.message
            : "Settings unavailable",
        );
      }

      if (sec.status === "fulfilled") setSecurity(sec.value);
      else if (ws.status !== "fulfilled" && !cachedNow?.security) setSecurity(null);

      if (caps.status === "fulfilled") setCapabilities(caps.value);
      else if (ws.status !== "fulfilled" && !cachedNow?.capabilities) {
        setCapabilities(null);
      }

      setLoading(false);

      if (ws.status !== "fulfilled") return;
      const onSettingsHub =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/settings");
      if (!onSettingsHub && tick === 0) return;
      const pages = await Promise.allSettled([getCrmSettingsCatalog()]);
      if (cancelled) return;
      const catalog =
        pages[0]?.status === "fulfilled" ? pages[0].value.catalog : null;
      if (!catalog) return;
      mirrorOfficeCalendar(catalog);
      setSettingsState((prev) => {
        if (isNewerRevision(prev, ws.value)) return prev;
        const next = {
          ...ws.value,
          catalog: {
            ...(prev?.catalog ?? {}),
            ...(ws.value.catalog ?? {}),
            ...catalog,
          },
        };
        writeSettingsCache({
          settings: next,
          security: sec.status === "fulfilled" ? sec.value : cachedNow?.security ?? null,
          capabilities:
            caps.status === "fulfilled" ? caps.value : cachedNow?.capabilities ?? null,
        });
        return next;
      });
    };

    // Let / and dashboard compile before the four settings BFF routes.
    const waitMs = cachedNow?.settings && tick === 0 ? 2_500 : tick === 0 ? 400 : 0;
    const timer = window.setTimeout(() => {
      void run();
    }, waitMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, tick]);

  return {
    source,
    loading,
    error,
    settings,
    security,
    capabilities,
    refresh,
    setSettings,
    setSecurity,
    setCapabilities,
    previewBrand,
    setPreviewBrand,
  };
}

/** One GET /settings + /security + /capabilities for the whole Settings chrome. */
export function SettingsCrmProvider({ children }: { children: ReactNode }) {
  const value = useCrmSettingsState(true);
  return (
    <SettingsCrmContext.Provider value={value}>
      {children}
    </SettingsCrmContext.Provider>
  );
}

export function useCrmSettings(): CrmSettingsState {
  const ctx = useContext(SettingsCrmContext);
  const local = useCrmSettingsState(!ctx);
  return ctx ?? local;
}
