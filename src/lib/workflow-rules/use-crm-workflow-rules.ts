"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmWorkflowRules } from "@/lib/workflow-rules/api";
import { replaceCrmWorkflowRules } from "@/lib/workflow-rules/types";

export type WorkflowRulesDataSource = "api" | "demo";

export function useCrmWorkflowRules() {
  const [source, setSource] = useState<WorkflowRulesDataSource>("demo");
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
        const remote = await listCrmWorkflowRules();
        if (cancelled) return;
        replaceCrmWorkflowRules(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Workflow rules unavailable",
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
