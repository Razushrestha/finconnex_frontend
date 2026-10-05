"use client";

import { useCallback, useEffect, useState } from "react";
import { syncCrmTimeEntries } from "@/lib/time-tracking/api";

export type TimeEntriesDataSource = "api" | "demo";

export function useCrmTimeEntries() {
  const [source, setSource] = useState<TimeEntriesDataSource>("demo");
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
        await syncCrmTimeEntries();
        if (cancelled) return;
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Time entries unavailable");
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
