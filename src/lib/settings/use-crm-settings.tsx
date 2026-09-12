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
};

const SettingsCrmContext = createContext<CrmSettingsState | null>(null);

function useCrmSettingsState(enabled: boolean): CrmSettingsState {
  const [source, setSource] = useState<SettingsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<CrmWorkspaceSettings | null>(null);
  const [security, setSecurity] = useState<CrmSecuritySettings | null>(null);
  const [capabilities, setCapabilities] = useState<CrmCapabilities | null>(
    null,
  );
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const [ws, sec, caps] = await Promise.allSettled([
        getCrmWorkspaceSettings(),
        getCrmSecuritySettings(),
        getCrmWorkspaceCapabilities(),
      ]);
      if (cancelled) return;

      if (ws.status === "fulfilled") {
        setSettings(ws.value);
        setSource("api");
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
