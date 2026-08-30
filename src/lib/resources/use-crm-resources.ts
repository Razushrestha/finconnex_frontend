"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmResources } from "@/lib/resources/api";
import { replaceCrmResources } from "@/lib/resources/types";

export type ResourcesDataSource = "api" | "demo";

export function useCrmResources() {
  const [source, setSource] = useState<ResourcesDataSource>("demo");
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
        const remote = await listCrmResources();
        if (cancelled) return;
        replaceCrmResources(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Resources unavailable");
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
