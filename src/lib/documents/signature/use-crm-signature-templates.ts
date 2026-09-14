"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmSignatureTemplates } from "@/lib/documents/signature/templates-api";
import { replaceCrmSignatureTemplates } from "@/lib/documents/signature/types";
import { getTenantContext } from "@/lib/persistence/tenant";

export type SignatureTemplatesDataSource = "api" | "demo";

export function useCrmSignatureTemplates() {
  const [source, setSource] = useState<SignatureTemplatesDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const workspaceId = getTenantContext().tenantId;

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await listCrmSignatureTemplates();
        if (cancelled) return;
        replaceCrmSignatureTemplates(remote);
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
  }, [tick, workspaceId]);

  return { source, loading, error, refresh, workspaceId };
}
