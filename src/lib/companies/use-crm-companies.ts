"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmCompanies } from "@/lib/companies/api";
import { mergeCrmCompaniesIntoBoard } from "@/lib/companies/store";

export type CompaniesDataSource = "api" | "demo";

export function useCrmCompanies() {
  const [source, setSource] = useState<CompaniesDataSource>("demo");
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
        const remote = await listCrmCompanies();
        if (cancelled) return;
        if (remote.length) mergeCrmCompaniesIntoBoard(remote);
        setSource(remote.length ? "api" : "demo");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Companies unavailable");
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
