"use client";

import {
  TRIGGER_CATALOG,
  runStatusColor,
  type AutomationEntityType,
  type AutomationTriggerStats,
  type AutomationTriggerType,
} from "@/lib/automations/types";

import { SlideOverPanel } from "./SlideOverPanel";

/**
 * How often one entry point actually started the workflow.
 *
 * Counts are per trigger rather than per workflow because that is the
 * question a multi-trigger workflow raises: with several ways in, which one
 * is carrying the traffic, and which has never fired at all. The backend
 * tallies runs by the `triggerKey` it recorded when the run was created, so
 * the numbers survive reordering the cards.
 */
export function TriggerStatsPanel({
  trigger,
  stats,
  saved,
  onClose,
}: {
  trigger: {
    key: string;
    type: AutomationTriggerType | null;
    entityType: AutomationEntityType;
  };
  stats?: AutomationTriggerStats;
  /** A workflow that has never been saved has no runs to report. */
  saved: boolean;
  onClose: () => void;
}) {
  const meta = trigger.type ? TRIGGER_CATALOG[trigger.type] : null;
  const byStatus = Object.entries(stats?.byStatus ?? {}).sort(
    ([, a], [, b]) => (b ?? 0) - (a ?? 0)
  );
  const runs = stats?.runs ?? 0;

  return (
    <SlideOverPanel
      title="Trigger stats"
      subtitle={meta ? meta.label : "Trigger not chosen yet"}
      onClose={onClose}
    >
      {!saved || !trigger.type ? (
        <p className="text-sm text-slate-500">
          Save and publish this workflow to start collecting runs for this trigger.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-3xl font-semibold text-slate-800">{runs}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {runs === 1 ? "run started by this trigger" : "runs started by this trigger"}
            </div>
          </div>

          {byStatus.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                By status
              </h3>
              <ul className="space-y-1.5">
                {byStatus.map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${runStatusColor(status)}`}
                    >
                      {status.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              This trigger has not fired yet. Counts appear here once a record matches it.
            </p>
          )}

          <p className="text-xs text-slate-400">
            Counts cover every run of this workflow, including ones started by earlier
            versions of this trigger.
          </p>
        </div>
      )}
    </SlideOverPanel>
  );
}
