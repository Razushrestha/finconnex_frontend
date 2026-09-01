"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmDocuments } from "@/lib/documents/library/api";
import { replaceLibraryDocuments } from "@/lib/documents/library/types";

export type DocumentsDataSource = "api" | "demo";

export function useCrmDocuments() {
  const [source, setSource] = useState<DocumentsDataSource>("demo");
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
        const remote = await listCrmDocuments();
        if (cancelled) return;
        replaceLibraryDocuments(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Documents unavailable");
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
