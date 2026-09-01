"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmMyWorkspaces } from "@/lib/workspaces/api";
import { replaceCrmWorkspaces } from "@/lib/workspaces/types";

export type MyWorkspacesDataSource = "api" | "demo";

export function useCrmMyWorkspaces() {
  const [source, setSource] = useState<MyWorkspacesDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await listCrmMyWorkspaces();
        if (cancelled) return;
        replaceCrmWorkspaces(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Workspaces unavailable",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, refresh };
}
