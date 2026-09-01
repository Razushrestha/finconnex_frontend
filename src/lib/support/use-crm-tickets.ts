"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmTickets } from "@/lib/support/api";
import { replaceCrmTickets } from "@/lib/support/types";

export type TicketsDataSource = "api" | "demo";

export function useCrmTickets() {
  const [source, setSource] = useState<TicketsDataSource>("demo");
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
        const remote = await listCrmTickets();
        if (cancelled) return;
        replaceCrmTickets(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Tickets unavailable");
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
