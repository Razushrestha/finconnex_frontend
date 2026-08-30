"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmMessages } from "@/lib/messages/api";
import { replaceCrmMessages } from "@/lib/messages/store";

export type MessagesDataSource = "api" | "demo";

export function useCrmMessages() {
  const [source, setSource] = useState<MessagesDataSource>("demo");
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
        const remote = await listCrmMessages();
        if (cancelled) return;
        replaceCrmMessages(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Messages unavailable");
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
