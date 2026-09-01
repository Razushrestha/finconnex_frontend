"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmQuotes } from "@/lib/finance/quotations/api";
import { replaceCrmQuotations } from "@/lib/finance/quotations/types";

export type QuotationsDataSource = "api" | "demo";

export function useCrmQuotations() {
  const [source, setSource] = useState<QuotationsDataSource>("demo");
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
        const remote = await listCrmQuotes();
        if (cancelled) return;
        replaceCrmQuotations(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Quotes unavailable");
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
