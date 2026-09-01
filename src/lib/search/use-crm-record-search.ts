"use client";

import { useEffect, useState } from "react";
import {
  searchCrmRecords,
  type CrmRecordSearchHit,
} from "@/lib/search/api";

export type RecordSearchSource = "idle" | "api" | "error";

export function useCrmRecordSearch(query: string) {
  const [hits, setHits] = useState<CrmRecordSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<RecordSearchSource>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      setSource("idle");
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const remote = await searchCrmRecords({ q, limit: 12 });
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
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return { hits, loading, source, error };
}
