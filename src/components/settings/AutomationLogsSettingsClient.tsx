"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listWorkspaceAutomationRuns } from "@/lib/automations/api";
import type { AutomationRun } from "@/lib/automations/types";
import {
  listWorkflowLogs,
  listWorkflowRuns,
  type WorkflowLogEntry,
} from "@/lib/workflows/runner";

/** Settings → Workflow & Automation → Automation Logs */
export function AutomationLogsSettingsClient() {
  const [crmRuns, setCrmRuns] = useState<AutomationRun[] | null>(null);
  const [source, setSource] = useState<"api" | "local">("local");
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | "all">("all");
  const [localLogs, setLocalLogs] = useState<WorkflowLogEntry[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await listWorkspaceAutomationRuns({ limit: 50 });
      setCrmRuns(page.items);
      setSource("api");
    } catch (err) {
      setCrmRuns(null);
      setSource("local");
      setError(err instanceof Error ? err.message : "CRM runs unavailable");
      setLocalLogs(
        listWorkflowLogs(runId === "all" ? undefined : runId),
      );
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const localRuns = source === "local" ? listWorkflowRuns() : [];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">
            Automation logs
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {source === "api" ? (
              <>
                Live runs from{" "}
                <code className="rounded bg-slate-100 px-1">GET /v1/automation-runs</code>
                . Manage rules in{" "}
                <Link href="/automations" className="font-semibold text-violet-600">
                  Automations
                </Link>
                .
              </>
            ) : (
              <>
                CRM runs unavailable
                {error ? ` (${error})` : ""}. Showing local journey test logs
                from{" "}
                <Link href="/journeys" className="font-semibold text-violet-600">
                  Journeys
                </Link>
                .
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {source === "local" ? (
              <select
                value={runId}
                onChange={(e) => setRunId(e.target.value as typeof runId)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
              >
                <option value="all">All runs</option>
                {localRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.journeyName} · {r.status} · {r.startedAt}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>
        <ul className="divide-y divide-slate-50">
          {source === "api" ? (
            !crmRuns?.length ? (
              <li className="px-5 py-10 text-center text-[12px] text-slate-400">
                No automation runs yet.
              </li>
            ) : (
              crmRuns.map((run) => (
                <li key={run.id} className="px-5 py-2.5 text-[12px]">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {run.triggerType} · {run.status}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {run.startedAt || run.createdAt || ""}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {run.triggerEntityType}
                    {run.triggerEntityId ? ` · ${run.triggerEntityId}` : ""}
                    {run.errorCategory ? ` · ${run.errorCategory}` : ""}
                  </p>
                </li>
              ))
            )
          ) : localLogs.length === 0 ? (
            <li className="px-5 py-10 text-center text-[12px] text-slate-400">
              No workflow logs yet.
            </li>
          ) : (
            localLogs.slice(0, 100).map((l) => (
              <li key={l.id} className="px-5 py-2.5 text-[12px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold text-slate-800">{l.message}</p>
                  <span className="text-[10px] text-slate-400">{l.at}</span>
                </div>
                <p className="text-[10px] text-slate-400">{l.journeyName}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
