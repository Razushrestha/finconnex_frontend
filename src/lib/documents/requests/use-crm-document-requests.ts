"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmDocumentRequests } from "@/lib/documents/requests/api";
import { replaceDocumentRequests } from "@/lib/documents/requests/types";

export type DocumentRequestsDataSource = "api" | "demo";

export function useCrmDocumentRequests() {
  const [source, setSource] = useState<DocumentRequestsDataSource>("demo");
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
        const remote = await listCrmDocumentRequests();
        if (cancelled) return;
        replaceDocumentRequests(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Document requests unavailable",
        );
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
