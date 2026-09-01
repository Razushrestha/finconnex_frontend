"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmReports } from "@/lib/reports/api";
import { replaceCrmReports } from "@/lib/reports/types";

export type ReportsDataSource = "api" | "demo";

export function useCrmReports() {
  const [source, setSource] = useState<ReportsDataSource>("demo");
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
        const remote = await listCrmReports();
        if (cancelled) return;
        replaceCrmReports(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Reports unavailable");
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
