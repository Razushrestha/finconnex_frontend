"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmNotes } from "@/lib/notes/api";
import { replaceCrmNotes } from "@/lib/notes/store";

export type NotesDataSource = "api" | "demo";

export function useCrmNotes() {
  const [source, setSource] = useState<NotesDataSource>("demo");
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
        const remote = await listCrmNotes();
        if (cancelled) return;
        replaceCrmNotes(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Notes unavailable");
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
