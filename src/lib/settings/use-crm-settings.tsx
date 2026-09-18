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

type SettingsCache = {
  settings: CrmWorkspaceSettings | null;
  security: CrmSecuritySettings | null;
  capabilities: CrmCapabilities | null;
};

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
  const cached = typeof window !== "undefined" ? readSettingsCache() : null;
  const [source, setSource] = useState<SettingsDataSource>(
    cached?.settings ? "api" : "demo",
  );
  const [loading, setLoading] = useState(!cached?.settings);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<CrmWorkspaceSettings | null>(
    cached?.settings ?? null,
  );
  const [security, setSecurity] = useState<CrmSecuritySettings | null>(
    cached?.security ?? null,
  );
  const [capabilities, setCapabilities] = useState<CrmCapabilities | null>(
    cached?.capabilities ?? null,
  );
  const [previewBrand, setPreviewBrand] = useState<
    Partial<Pick<CrmWorkspaceSettings, "primaryColor" | "secondaryColor">> | null
  >(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    if (!settings) setLoading(true);
    setError(null);

    void (async () => {
      const [ws, sec, caps, pages] = await Promise.allSettled([
        getCrmWorkspaceSettings(),
        getCrmSecuritySettings(),
        getCrmWorkspaceCapabilities(),
        getCrmSettingsCatalog(),
      ]);
      if (cancelled) return;

      if (ws.status === "fulfilled") {
        const fromPages =
          pages.status === "fulfilled" ? pages.value.catalog : null;
        setSettings(
          fromPages
            ? {
                ...ws.value,
                catalog: { ...fromPages, ...(ws.value.catalog ?? {}) },
              }
            : ws.value,
        );
        setSource("api");
        writeSettingsCache({
          settings:
            fromPages
              ? {
                  ...ws.value,
                  catalog: { ...fromPages, ...(ws.value.catalog ?? {}) },
                }
              : ws.value,
          security: sec.status === "fulfilled" ? sec.value : security,
          capabilities: caps.status === "fulfilled" ? caps.value : capabilities,
        });
      } else {
        setSettings(null);
        setSource("demo");
        setError(
          ws.reason instanceof Error
            ? ws.reason.message
            : "Settings unavailable",
        );
      }

      if (sec.status === "fulfilled") setSecurity(sec.value);
      else if (ws.status !== "fulfilled") setSecurity(null);

      if (caps.status === "fulfilled") setCapabilities(caps.value);
      else if (ws.status !== "fulfilled") setCapabilities(null);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
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
