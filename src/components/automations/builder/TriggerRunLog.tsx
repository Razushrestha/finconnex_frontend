"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FlaskConical, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listTriggerRuns } from "@/lib/automations/api";
import {
  formatLogRelative,
  formatLogTime,
  formatStepDuration,
  mergeFirstPage,
  runFailed,
  runFinishedAt,
  runLogIsLive,
  statusLabel,
  stepLabel,
  stepTestNote,
  testDataCountdown,
  testDataRows,
} from "@/lib/automations/run-log";
import { runStatusColor, type AutomationRunLogEntry } from "@/lib/automations/types";
import { loadAssignableOwners } from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const POLL_MS = 3_000;

/**
 * Every run one trigger started, newest first. A row expands into its steps
 * — which action ran, how it ended, and when — and, for a test run, the
 * dummy record it ran against and when that record is deleted.
 *
 * While a run is still going, or a test's data has not been deleted yet,
 * the first page is re-read every few seconds so the row moves on its own.
 */
export function TriggerRunLog({
  automationId,
  triggerKey,
  refreshKey = 0,
  expandRunId,
}: {
  automationId: string;
  triggerKey: string;
  /** Bumped by the builder after it starts a test, to show the new run now. */
  refreshKey?: number;
  /** A run to open as soon as it appears — the test just started. */
  expandRunId?: string | null;
}) {
  const [runs, setRuns] = useState<AutomationRunLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  /** Whether `total` is the real count; an older server only gives a floor. */
  const [total, setTotal] = useState<{ count: number; exact: boolean }>({ count: 0, exact: true });
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Rows the user opened or closed. A row's default is closed, except the
   * test that was just started, which opens on its own.
   */
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => new Date());
  const [names, setNames] = useState<Record<string, string>>({});

  const refreshFirstPage = useCallback(async () => {
    const result = await listTriggerRuns(automationId, triggerKey, { page: 1, limit: PAGE_SIZE });
    setRuns((current) => mergeFirstPage(current, result.items));
    // Later pages already loaded keep "Load more" in step with them.
    setHasMore((more) => more || result.hasMore);
    setTotal((current) => ({ count: Math.max(current.count, result.total), exact: result.exact }));
    setError(null);
  }, [automationId, triggerKey]);

  useEffect(() => {
    let cancelled = false;
    listTriggerRuns(automationId, triggerKey, { page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setRuns(result.items);
        setTotal({ count: result.total, exact: result.exact });
        setHasMore(result.hasMore);
        setPage(1);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load runs"))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [automationId, triggerKey, refreshKey]);

  // Member ids in test notes ("instead of …") read better as names.
  useEffect(() => {
    let cancelled = false;
    loadAssignableOwners()
      .then((owners) => {
        if (cancelled) return;
        setNames(Object.fromEntries(owners.map((owner) => [owner.id, owner.name || owner.email])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const live = runLogIsLive(runs);
  useEffect(() => {
    if (!live) return;
    const poll = window.setInterval(() => {
      refreshFirstPage().catch(() => undefined);
    }, POLL_MS);
    const tick = window.setInterval(() => setNow(new Date()), 1_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [live, refreshFirstPage]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await listTriggerRuns(automationId, triggerKey, { page: next, limit: PAGE_SIZE });
      setRuns((current) => {
        const seen = new Set(current.map((run) => run.id));
        return [...current, ...result.items.filter((run) => !seen.has(run.id))];
      });
      setTotal({ count: result.total, exact: result.exact });
      setHasMore(result.hasMore);
      setPage(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more runs");
    } finally {
      setLoadingMore(false);
    }
  }

  const isOpen = (id: string) => (id === expandRunId) !== toggled.has(id);

  function toggle(id: string) {
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const nameOf = useCallback((id: string) => names[id], [names]);

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading runs…
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {runs.length === 0 ? (
        <p className="text-sm text-slate-500">
          {total.exact
            ? "No runs yet. Press Test Workflow to try this trigger with test data."
            : "No runs for this trigger yet. Test runs will show here once the CRM server has the test-run update."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              open={isOpen(run.id)}
              onToggle={() => toggle(run.id)}
              now={now}
              nameOf={nameOf}
            />
          ))}
        </ul>
      )}
      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => void loadMore()}
          disabled={loadingMore}
        >
          {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {total.exact ? `Load more (${total.count - runs.length} older)` : "Load more"}
        </Button>
      )}
    </div>
  );
}

function RunRow({
  run,
  open,
  onToggle,
  now,
  nameOf,
}: {
  run: AutomationRunLogEntry;
  open: boolean;
  onToggle: () => void;
  now: Date;
  nameOf: (id: string) => string | undefined;
}) {
  const finishedAt = runFinishedAt(run);
  const countdown = testDataCountdown(run, now);
  const data = useMemo(() => testDataRows(run.testData), [run.testData]);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                runStatusColor(run.status)
              )}
            >
              {statusLabel(run.status)}
            </span>
            {run.isTest && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                <FlaskConical className="h-3 w-3" /> Test
              </span>
            )}
            <span className="text-xs text-slate-400">{formatLogRelative(run.createdAt, now)}</span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Triggered {formatLogTime(run.createdAt)}
            {finishedAt && (
              <span className={runFailed(run) ? "text-rose-600" : undefined}>
                {" · "}
                {runFailed(run) ? "Failed" : "Finished"} {formatLogTime(finishedAt)}
              </span>
            )}
          </div>
          {countdown && <div className="mt-0.5 text-[11px] text-violet-600">{countdown}</div>}
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-3 py-3 pl-9">
          {run.errorCategory && (
            <p className="text-xs text-rose-600">Error: {statusLabel(run.errorCategory)}</p>
          )}
          {run.isTest && data.length > 0 && (
            <div>
              <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Test data
              </h4>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                {data.map((row) => (
                  <div key={row.label} className="contents">
                    <dt className="text-slate-500">{row.label}</dt>
                    <dd className="truncate text-slate-700">{nameOf(row.value) ?? row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Steps
            </h4>
            {run.steps.length === 0 ? (
              <p className="text-xs text-slate-500">
                {run.status === "QUEUED" ? "Waiting to start…" : "No steps ran."}
              </p>
            ) : (
              <ol className="space-y-2">
                {run.steps.map((step) => {
                  const note = stepTestNote(step, nameOf);
                  const duration = formatStepDuration(step);
                  return (
                    <li key={step.id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-700">
                          {step.stepIndex + 1}. {stepLabel(step)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                            runStatusColor(step.status)
                          )}
                        >
                          {statusLabel(step.status)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {step.startedAt ? `Started ${formatLogTime(step.startedAt)}` : null}
                        {step.startedAt && step.completedAt ? " · " : null}
                        {step.completedAt ? `Ended ${formatLogTime(step.completedAt)}` : null}
                        {duration ? ` (${duration})` : null}
                        {!step.startedAt && !step.completedAt ? "Not run" : null}
                      </div>
                      {step.errorCategory && (
                        <div className="mt-0.5 text-[11px] text-rose-600">
                          Error: {statusLabel(step.errorCategory)}
                        </div>
                      )}
                      {note && <div className="mt-0.5 text-[11px] text-violet-700">{note}</div>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
