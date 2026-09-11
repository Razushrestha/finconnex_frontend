"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmSignatureTemplates } from "@/lib/documents/signature/templates-api";
import {
  upsertSignatureRequest,
} from "@/lib/documents/signature/types";

export type SignatureTemplatesDataSource = "api" | "demo";

export function useCrmSignatureTemplates() {
  const [source, setSource] = useState<SignatureTemplatesDataSource>("demo");
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
        const remote = await listCrmSignatureTemplates();
        if (cancelled) return;
        for (const row of remote) {
          upsertSignatureRequest(
            { ...row, recordType: "template" },
            { allowEmptyFields: true },
          );
        }
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Signature templates unavailable",
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
