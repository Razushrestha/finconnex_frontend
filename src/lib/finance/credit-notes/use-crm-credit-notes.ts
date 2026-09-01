"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmCreditNotes } from "@/lib/finance/credit-notes/api";
import { replaceCrmCreditNotes } from "@/lib/finance/credit-notes/types";

export type CreditNotesDataSource = "api" | "demo";

export function useCrmCreditNotes() {
  const [source, setSource] = useState<CreditNotesDataSource>("demo");
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
        const remote = await listCrmCreditNotes();
        if (cancelled) return;
        replaceCrmCreditNotes(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Credit notes unavailable");
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
