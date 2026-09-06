"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCompletedCrmCalls,
  listCrmCallHistory,
  listCrmCalls,
  listMissedCrmCalls,
  listMyCrmCalls,
  listTodayCrmCalls,
  listUpcomingCrmCalls,
  tryCrm,
} from "@/lib/calls/api";
import { replaceCrmCalls } from "@/lib/calls/store";

export type CallsDataSource = "api" | "demo" | "mixed";

export function useCrmCalls() {
  const [source, setSource] = useState<CallsDataSource>("demo");
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
        const [all, upcoming, history, today, completed, missed, mine] =
          await Promise.all([
            tryCrm(() => listCrmCalls()),
            tryCrm(() => listUpcomingCrmCalls()),
            tryCrm(() => listCrmCallHistory()),
            tryCrm(() => listTodayCrmCalls()),
            tryCrm(() => listCompletedCrmCalls()),
            tryCrm(() => listMissedCrmCalls()),
            tryCrm(() => listMyCrmCalls()),
          ]);
        if (cancelled) return;
        const remote = [
          ...(all ?? []),
          ...(upcoming ?? []),
          ...(history ?? []),
          ...(today ?? []),
          ...(completed ?? []),
          ...(missed ?? []),
          ...(mine ?? []),
        ];
        const byId = new Map(remote.map((c) => [c.id, c]));
        const unique = [...byId.values()];
        replaceCrmCalls(unique);
        setSource("api");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Calls unavailable");
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
