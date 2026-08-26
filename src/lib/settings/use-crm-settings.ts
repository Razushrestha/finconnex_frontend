"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCrmWorkspaceCapabilities,
  getCrmWorkspaceSettings,
  getCrmSecuritySettings,
  type CrmCapabilities,
  type CrmSecuritySettings,
  type CrmWorkspaceSettings,
} from "@/lib/settings/api";

export type SettingsDataSource = "api" | "demo";

export function useCrmSettings() {
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
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await getCrmWorkspaceSettings();
        if (cancelled) return;
        setSettings(remote);
        setSource("api");
        try {
          const sec = await getCrmSecuritySettings();
          if (!cancelled) setSecurity(sec);
        } catch {
          /* security is a subset of workspace settings */
        }
        try {
          const caps = await getCrmWorkspaceCapabilities();
          if (!cancelled) setCapabilities(caps);
        } catch {
          /* capabilities derived from flags */
        }
      } catch (err) {
        if (cancelled) return;
        setSettings(null);
        setSource("demo");
        setError(err instanceof Error ? err.message : "Settings unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    source,
    loading,
    error,
    settings,
    security,
    capabilities,
    refresh,
    setSettings,
  };
}
