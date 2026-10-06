"use client";

import { useEffect, useState } from "react";
import type { CrmRecordSearchHit } from "@/lib/search/api";

export type RecordSearchSource = "idle" | "api" | "error";

export function useCrmRecordSearch(query: string) {
  const [hits, setHits] = useState<CrmRecordSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<RecordSearchSource>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      setSource("idle");
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { searchWorkspaceRecords } = await import(
            "@/lib/search/workspace-search"
          );
          const remote = await searchWorkspaceRecords(q);
          if (cancelled) return;
          setHits(remote);
          setSource("api");
        } catch (err) {
          if (cancelled) return;
          setHits([]);
          setSource("error");
          setError(err instanceof Error ? err.message : "Search unavailable");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return { hits, loading, source, error };
}
