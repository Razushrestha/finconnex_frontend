"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCrmCallHistory,
  listCrmCalls,
  listUpcomingCrmCalls,
  tryCrm,
} from "@/lib/calls/api";
import { mergeCrmCalls } from "@/lib/calls/store";

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
        const [all, upcoming, history] = await Promise.all([
          listCrmCalls(),
          tryCrm(() => listUpcomingCrmCalls()),
          tryCrm(() => listCrmCallHistory()),
        ]);
        if (cancelled) return;
        const remote = [
          ...all,
          ...(upcoming ?? []),
          ...(history ?? []),
        ];
        const byId = new Map(remote.map((c) => [c.id, c]));
        const unique = [...byId.values()];
        if (unique.length) mergeCrmCalls(unique);
        setSource(unique.length ? "api" : "demo");
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
