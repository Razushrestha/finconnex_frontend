"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmEstimates } from "@/lib/finance/estimates/api";
import { replaceCrmEstimates } from "@/lib/finance/estimates/types";

export type EstimatesDataSource = "api" | "demo";

export function useCrmEstimates() {
  const [source, setSource] = useState<EstimatesDataSource>("demo");
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
        const remote = await listCrmEstimates();
        if (cancelled) return;
        replaceCrmEstimates(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Estimates unavailable");
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
