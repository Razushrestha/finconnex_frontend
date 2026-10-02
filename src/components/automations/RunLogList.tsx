"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, FlaskConical, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TriggerRunPage } from "@/lib/automations/api";
import {
  formatLogRelative,
  formatLogTime,
  mergeFirstPage,
  runFailed,
  runFinishedAt,
  runLogIsLive,
  statusLabel,
  stepDotClass,
  stepLabel,
  stepTestNote,
  stepTime,
  testDataCountdown,
  testDataRows,
  triggerLabel,
} from "@/lib/automations/run-log";
import { runStatusColor, type AutomationRunLogEntry } from "@/lib/automations/types";
import { loadAssignableOwners } from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const POLL_MS = 3_000;

/**
 * A run log, newest first: one trigger's runs in the builder, or every
 * workflow's on the logs page. A row expands into a timeline of its steps —
 * a dot per step, green once it completed, with the step and when it
 * happened — and, for a test run, the dummy record it ran against.
 *
 * While a run is still going, or a test's data has not been deleted yet,
 * the first page is re-read every few seconds so rows move on their own.
 *
 * `fetchPage` must be stable (useCallback): a new function reloads the log.
 */
export function RunLogList({
  fetchPage,
  refreshKey = 0,
  expandRunId,
  onRunsChanged,
  showWorkflow = false,
  emptyText,
}: {
  fetchPage: (page: number, limit: number) => Promise<TriggerRunPage>;
  /** Bump to re-read from the first page, e.g. after starting a test. */
  refreshKey?: number;
  /** A run to open as soon as it appears — the test just started. */
  expandRunId?: string | null;
  /** Called when a run appears or changes status, so counts can be re-read. */
  onRunsChanged?: () => void;
  /** Name the workflow and trigger on each row — for the cross-workflow log. */
  showWorkflow?: boolean;
  emptyText: { current: string; olderServer: string };
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
    const result = await fetchPage(1, PAGE_SIZE);
    setRuns((current) => mergeFirstPage(current, result.items));
    // Later pages already loaded keep "Load more" in step with them.
    setHasMore((more) => more || result.hasMore);
    setTotal((current) => ({ count: Math.max(current.count, result.total), exact: result.exact }));
    setError(null);
  }, [fetchPage]);

  useEffect(() => {
    let cancelled = false;
    fetchPage(1, PAGE_SIZE)
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
  }, [fetchPage, refreshKey]);

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

  // A run appearing or moving on changes the counts above the log too.
  const statusSignature = runs.map((run) => `${run.id}:${run.status}`).join("|");
  useEffect(() => {
    if (statusSignature) onRunsChanged?.();
  }, [statusSignature, onRunsChanged]);

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
      const result = await fetchPage(next, PAGE_SIZE);
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
        <p className="text-sm text-slate-500">{total.exact ? emptyText.current : emptyText.olderServer}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              open={isOpen(run.id)}
              onToggle={() => toggle(run.id)}
              now={now}
              nameOf={nameOf}
              showWorkflow={showWorkflow}
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
  showWorkflow,
}: {
  run: AutomationRunLogEntry;
  open: boolean;
  onToggle: () => void;
  now: Date;
  nameOf: (id: string) => string | undefined;
  showWorkflow: boolean;
}) {
  const finishedAt = runFinishedAt(run);
  const countdown = testDataCountdown(run, now);
  const data = useMemo(() => testDataRows(run.testData), [run.testData]);
  const trigger = triggerLabel(run.triggerType);

  return (
    <li>
      <div className="flex items-start">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
        >
          {open ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0 flex-1">
            {showWorkflow && (
              <div className="mb-1 truncate text-sm font-medium text-slate-800">
                {run.automation?.name ?? "Workflow"}
                {trigger && <span className="font-normal text-slate-400"> · {trigger}</span>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", runStatusColor(run.status))}
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
        {showWorkflow && run.automation && (
          <Link
            href={`/automations/${run.automation.id}`}
            className="m-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Open workflow"
            aria-label={`Open ${run.automation.name}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-3 py-3 pl-9">
          <StepTimeline run={run} nameOf={nameOf} />
          {run.isTest && data.length > 0 && (
            <div>
              <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Test data</h4>
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
        </div>
      )}
    </li>
  );
}

/**
 * Steps as a timeline: a dot per step on one line — green once it completed,
 * red if it failed, grey if skipped — then the step and when it happened.
 * How a step ended, its error, and what a test did instead sit in its
 * tooltip, keeping the timeline to title and time.
 */
function StepTimeline({
  run,
  nameOf,
}: {
  run: AutomationRunLogEntry;
  nameOf: (id: string) => string | undefined;
}) {
  if (run.steps.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        {run.status === "QUEUED" ? "Waiting to start…" : "No steps ran."}
      </p>
    );
  }
  return (
    <ol className="relative ml-1 border-l border-slate-200">
      {run.steps.map((step) => {
        const time = stepTime(step);
        const note = stepTestNote(step, nameOf);
        const detail = [
          statusLabel(step.status),
          note,
          step.errorCategory ? `Error: ${statusLabel(step.errorCategory)}` : null,
        ]
          .filter(Boolean)
          .join(" — ");
        return (
          <li key={step.id} className="relative pb-3 pl-4 last:pb-0" title={detail}>
            <span
              aria-hidden
              className={cn(
                "absolute top-1 -left-[5px] h-2.5 w-2.5 rounded-full ring-2 ring-slate-50",
                stepDotClass(step.status)
              )}
            />
            <div className="text-xs font-medium text-slate-700">{stepLabel(step)}</div>
            <div className="text-[11px] text-slate-500">{time ? formatLogTime(time) : "Not run"}</div>
            <span className="sr-only">{detail}</span>
          </li>
        );
      })}
    </ol>
  );
}
