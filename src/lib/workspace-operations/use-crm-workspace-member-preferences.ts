"use client";

import { useCallback, useEffect, useState } from "react";
import { getCrmWorkspaceMemberPreferences } from "@/lib/workspace-operations/api";
import type { WorkspaceMemberPreferences } from "@/lib/workspace-operations/types";

export type WorkspaceMemberPreferencesSource = "api" | "demo";

export function useCrmWorkspaceMemberPreferences(enabled: boolean) {
  const [source, setSource] = useState<WorkspaceMemberPreferencesSource>("demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] =
    useState<WorkspaceMemberPreferences | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await getCrmWorkspaceMemberPreferences();
        if (cancelled) return;
        setPreferences(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setPreferences(null);
        setSource("demo");
        setError(
          err instanceof Error
            ? err.message
            : "Member preferences unavailable",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { source, loading, error, preferences, setPreferences, refresh };
}
