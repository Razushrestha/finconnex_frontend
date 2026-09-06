"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmEmails } from "@/lib/emails/api";
import { replaceCrmEmails } from "@/lib/emails/store";

export type EmailsDataSource = "api" | "demo";

export function useCrmEmails() {
  const [source, setSource] = useState<EmailsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await listCrmEmails({ page: 1, limit: 100 });
        if (cancelled) return;
        replaceCrmEmails(remote);
        setSource("api");
        setError(null);
        setVersion((n) => n + 1);
      } catch (err) {
        if (cancelled) return;
        replaceCrmEmails([]);
        setSource("demo");
        setError(err instanceof Error ? err.message : "Emails unavailable");
        setVersion((n) => n + 1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, refresh, version };
}
