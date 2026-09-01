"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmInvoices } from "@/lib/finance/invoices/api";
import { replaceCrmInvoices } from "@/lib/finance/invoices/types";

export type InvoicesDataSource = "api" | "demo";

export function useCrmInvoices() {
  const [source, setSource] = useState<InvoicesDataSource>("demo");
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
        const remote = await listCrmInvoices();
        if (cancelled) return;
        replaceCrmInvoices(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Invoices unavailable");
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
