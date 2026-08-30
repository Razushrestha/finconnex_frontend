"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmSignatureRequests } from "@/lib/documents/signature/api";
import { replaceCrmSignatureRequests } from "@/lib/documents/signature/types";

export type SignatureRequestsDataSource = "api" | "demo";

export function useCrmSignatureRequests() {
  const [source, setSource] = useState<SignatureRequestsDataSource>("demo");
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
        const remote = await listCrmSignatureRequests();
        if (cancelled) return;
        replaceCrmSignatureRequests(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Signature requests unavailable",
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
