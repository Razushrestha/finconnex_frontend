"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RunLogList } from "@/components/automations/RunLogList";
import { RunOutcomeCards } from "@/components/automations/RunOutcomeCards";
import { getAutomationRunCounts, listWorkspaceRunLog } from "@/lib/automations/api";

/**
 * Every workflow's runs in one place, newest first, under the same Success /
 * Running / Fails cards the builder shows per trigger. Rows expand into the
 * run's step timeline.
 */
export function AutomationLogsClient() {
  const [counts, setCounts] = useState<Record<string, number> | undefined>(undefined);

  const refreshCounts = useCallback(() => {
    getAutomationRunCounts()
      .then(setCounts)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAutomationRunCounts()
      .then((next) => !cancelled && setCounts(next))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPage = useCallback(
    (page: number, limit: number) => listWorkspaceRunLog({ page, limit }),
    []
  );

  return (
    <div className="p-6">
      <div className="mb-5">
        <Link
          href="/automations"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" /> Workflows
        </Link>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Automation logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every run of every workflow, newest first. Open a run to see each step and when it ran.
        </p>
      </div>

      <div className="max-w-3xl space-y-5">
        <RunOutcomeCards byStatus={counts} />
        <p className="text-xs text-slate-400">
          Counts cover every real run in this workspace. Test runs appear in the list but are not
          counted.
        </p>
        <RunLogList
          fetchPage={fetchPage}
          onRunsChanged={refreshCounts}
          showWorkflow
          emptyText={{
            current: "No automation has run yet.",
            olderServer: "No automation has run yet.",
          }}
        />
      </div>
    </div>
  );
}
