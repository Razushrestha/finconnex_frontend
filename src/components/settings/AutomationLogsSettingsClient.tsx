"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listWorkflowLogs,
  listWorkflowRuns,
  type WorkflowLogEntry,
  type WorkflowRun,
} from "@/lib/workflows/runner";

/** Settings → Workflow & Automation → Automation Logs */
export function AutomationLogsSettingsClient() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [logs, setLogs] = useState<WorkflowLogEntry[]>([]);
  const [runId, setRunId] = useState<string | "all">("all");

  function refresh() {
    setRuns(listWorkflowRuns());
    setLogs(listWorkflowLogs(runId === "all" ? undefined : runId));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">
            Automation logs
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Journey test runs write here. Trigger from{" "}
            <Link href="/journeys" className="font-semibold text-violet-600">
              Journeys
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={runId}
              onChange={(e) => setRunId(e.target.value as typeof runId)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
            >
              <option value="all">All runs</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.journeyName} · {r.status} · {r.startedAt}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refresh}
              className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>
        <ul className="divide-y divide-slate-50">
          {logs.length === 0 ? (
            <li className="px-5 py-10 text-center text-[12px] text-slate-400">
              No workflow logs yet.
            </li>
          ) : (
            logs.slice(0, 100).map((l) => (
              <li key={l.id} className="px-5 py-2.5 text-[12px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold text-slate-800">
                    <span
                      className={
                        l.level === "error"
                          ? "text-rose-600"
                          : l.level === "success"
                            ? "text-emerald-700"
                            : l.level === "warn"
                              ? "text-amber-700"
                              : "text-slate-700"
                      }
                    >
                      [{l.level}]
                    </span>{" "}
                    {l.message}
                  </p>
                  <span className="text-[10px] text-slate-400">{l.at}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {l.journeyName}
                  {l.stepType ? ` · ${l.stepType}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
