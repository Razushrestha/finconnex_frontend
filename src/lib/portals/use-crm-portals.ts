"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmClientPortals } from "@/lib/portals/api";
import { mergeCrmPortals } from "@/lib/portals/types";

export type PortalsDataSource = "api" | "demo";

export function useCrmPortals() {
  const [source, setSource] = useState<PortalsDataSource>("demo");
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
        const remote = await listCrmClientPortals();
        if (cancelled) return;
        if (remote.length) mergeCrmPortals(remote);
        setSource(remote.length ? "api" : "demo");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Portals unavailable");
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
