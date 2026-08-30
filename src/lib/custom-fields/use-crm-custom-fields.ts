"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmCustomFields } from "@/lib/custom-fields/api";
import { replaceCrmCustomFields } from "@/lib/custom-fields/store";

export type CustomFieldsDataSource = "api" | "demo";

export function useCrmCustomFields() {
  const [source, setSource] = useState<CustomFieldsDataSource>("demo");
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
        const remote = await listCrmCustomFields();
        if (cancelled) return;
        replaceCrmCustomFields(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Custom fields unavailable");
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
