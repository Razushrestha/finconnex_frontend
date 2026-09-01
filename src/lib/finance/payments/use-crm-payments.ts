"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmPayments } from "@/lib/finance/payments/api";
import { replaceCrmPayments } from "@/lib/finance/payments/types";

export type PaymentsDataSource = "api" | "demo";

export function useCrmPayments() {
  const [source, setSource] = useState<PaymentsDataSource>("demo");
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
        const remote = await listCrmPayments();
        if (cancelled) return;
        replaceCrmPayments(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Payments unavailable");
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
