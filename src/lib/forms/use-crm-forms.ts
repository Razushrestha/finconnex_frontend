"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmForms } from "@/lib/forms/api";
import { replaceCrmMarketingForms } from "@/lib/marketing/forms/types";

export type FormsDataSource = "api" | "demo";

export function useCrmForms() {
  const [source, setSource] = useState<FormsDataSource>("demo");
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
        const remote = await listCrmForms();
        if (cancelled) return;
        replaceCrmMarketingForms(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Forms unavailable");
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
