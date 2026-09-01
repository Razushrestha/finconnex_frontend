"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmEmails } from "@/lib/emails/api";
import { mergeCrmEmails } from "@/lib/emails/store";

export type EmailsDataSource = "api" | "demo";

export function useCrmEmails() {
  const [source, setSource] = useState<EmailsDataSource>("demo");
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
        const remote = await listCrmEmails();
        if (cancelled) return;
        if (remote.length) mergeCrmEmails(remote);
        setSource(remote.length ? "api" : "demo");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Emails unavailable");
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
