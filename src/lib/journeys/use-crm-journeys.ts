"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmJourneys } from "@/lib/journeys/api";
import { replaceCrmJourneys } from "@/lib/journeys/types";

export type JourneysDataSource = "api" | "demo";

/** Mirrors src/lib/workflow-rules/use-crm-workflow-rules.ts's pattern. */
export function useCrmJourneys() {
  const [source, setSource] = useState<JourneysDataSource>("demo");
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
        const remote = await listCrmJourneys();
        if (cancelled) return;
        replaceCrmJourneys(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Journeys unavailable");
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
