"use client";

import { useCallback, useEffect, useState } from "react";
import { getCrmWorkspaceProfile } from "@/lib/workspace-operations/api";
import type { WorkspaceProfile } from "@/lib/workspace-operations/types";

export type WorkspaceProfileSource = "api" | "demo";

export function useCrmWorkspaceProfile() {
  const [source, setSource] = useState<WorkspaceProfileSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await getCrmWorkspaceProfile();
        if (cancelled) return;
        setProfile(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Workspace profile unavailable",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, profile, refresh };
}
