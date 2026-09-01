"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmRecycleBin } from "@/lib/recycle-bin/api";
import { replaceCrmRecycleBin } from "@/lib/rules/soft-delete";

export type RecycleBinDataSource = "api" | "demo";

export function useCrmRecycleBin(entityType?: string) {
  const [source, setSource] = useState<RecycleBinDataSource>("demo");
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
        const remote = await listCrmRecycleBin({
          entityType: entityType || undefined,
          limit: 100,
        });
        if (cancelled) return;
        replaceCrmRecycleBin(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Recycle bin unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, entityType]);

  return { source, loading, error, refresh };
}
