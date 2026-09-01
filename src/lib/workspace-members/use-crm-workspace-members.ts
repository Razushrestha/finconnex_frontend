"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCrmWorkspaceMembersSummary,
  listCrmWorkspaceMembers,
  tryCrmWorkspaceMembers,
} from "@/lib/workspace-members/api";
import { listCrmWorkspaceMembersAdmin } from "@/lib/workspace-operations/api";
import {
  emptyWorkspaceMembersSummary,
  replaceCrmWorkspaceMembers,
  type WorkspaceMembersSummary,
} from "@/lib/workspace-members/types";

export type WorkspaceMembersDataSource = "api" | "demo";

export function useCrmWorkspaceMembers(opts: { search?: string } = {}) {
  const [source, setSource] = useState<WorkspaceMembersDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkspaceMembersSummary>(
    emptyWorkspaceMembersSummary(),
  );
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        try {
          const page = await listCrmWorkspaceMembersAdmin({
            search: opts.search,
            limit: 50,
          });
          if (cancelled) return;
          replaceCrmWorkspaceMembers(page.items);
        } catch {
          const remote = await listCrmWorkspaceMembers();
          if (cancelled) return;
          replaceCrmWorkspaceMembers(remote);
        }
        const totals = await tryCrmWorkspaceMembers(() =>
          getCrmWorkspaceMembersSummary(),
        );
        if (!cancelled && totals) setSummary(totals);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Workspace members unavailable",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, opts.search]);

  return { source, loading, error, summary, refresh };
}
