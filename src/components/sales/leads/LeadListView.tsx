"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  MessageSquare,
  Mail,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Paperclip,
} from "lucide-react";
import { type KanbanColumn, type LeadStatus } from "@/lib/leads/types";
import { listLeadColumns } from "@/lib/leads/store";
import { onLeadActivityChange } from "@/lib/leads/lead-extras-store";
import {
  loadLeadCardSettings,
  onLeadCardSettingsChange,
  type LeadCardSettings,
} from "@/lib/leads/lead-card-settings";
import { onPipelineSlaChange } from "@/lib/pipeline-sla/settings";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import { truncateActivityTitle } from "@/lib/leads/activity-summary";
import {
  ACTIVITY_TITLE_TRUNCATE_AT,
  type LeadCardQuickActionState,
} from "@/lib/leads/card-types";
import {
  QUICK_BADGE,
  QUICK_STATE_WORDS,
  QUICK_URGENCY,
  URGENCY_SURFACE,
  URGENCY_WORDS,
} from "@/lib/leads/a11y-urgency";
import type { QuickActionKind } from "@/lib/leads/panel-actions";
import { LeadSlaChip } from "@/components/sales/leads/LeadSlaChip";
import type { LeadFilters } from "./FilterLeadsPanel";
import {
  LeadCardPanelHost,
  type LeadPanelState,
} from "./panels/LeadCardPanelHost";
import { cn } from "@/lib/utils";

interface LeadListViewProps {
  columns?: KanbanColumn[];
  filters?: LeadFilters;
}

const QUICK_ICONS = {
  call: Phone,
  sms: MessageSquare,
  email: Mail,
  meeting: CalendarDays,
  task: CheckSquare,
  note: StickyNote,
  attachment: Paperclip,
} as const;

const QUICK_LABELS: Record<LeadCardQuickActionState["kind"], string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  meeting: "Appointment",
  task: "Task",
  note: "Note",
  attachment: "Attachment",
};

export function LeadListView({
  columns: columnsProp,
  filters,
}: LeadListViewProps) {
  const [columns] = useState<KanbanColumn[]>(() =>
    columnsProp ?? listLeadColumns(),
  );
  const [cardSettings, setCardSettings] = useState<LeadCardSettings>(() =>
    loadLeadCardSettings(),
  );
  const [revision, setRevision] = useState(0);
  const [panel, setPanel] = useState<LeadPanelState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    return onLeadActivityChange(() => setRevision((n) => n + 1));
  }, []);

  useEffect(() => {
    return onLeadCardSettingsChange(() => {
      setCardSettings(loadLeadCardSettings());
      setRevision((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    return onPipelineSlaChange(() => setRevision((n) => n + 1));
  }, []);

  const allLeads = useMemo(() => {
    void revision;
    const source = columnsProp ?? columns;
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;

    return source
      .filter(
        (column) =>
          !hasStatusFilter ||
            filters!.statuses.includes(column.title) ||
            filters!.statuses.includes(column.leadStatus),
      )
      .flatMap((column) =>
        column.cards
          .filter(
            (card) =>
              !hasSourceFilter || filters!.sources.includes(card.source),
          )
          .map((card) => ({
            ...card,
            statusTitle: column.leadStatus,
            stageTitle: column.title,
            statusDotColor: column.dotColorClass,
          })),
      );
  }, [columns, columnsProp, filters, revision]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-[12px]">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-3 py-2.5">Lead</th>
              <th className="px-3 py-2.5">Company</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="min-w-[140px] px-3 py-2.5">Pipeline SLA</th>
              <th className="px-3 py-2.5">Owner</th>
              <th className="min-w-[200px] px-3 py-2.5">Activity</th>
              <th className="px-3 py-2.5">Last activity</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {allLeads.map((lead) => {
              const vm = buildLeadCardViewModelFromCard(
                lead,
                lead.statusTitle,
                { cardSettings },
              );
              const summary = vm.activitySummary;
              const summaryTitle = summary.primary
                ? truncateActivityTitle(
                    summary.primary.title,
                    ACTIVITY_TITLE_TRUNCATE_AT,
                  )
                : "";

              return (
                <tr
                  key={lead.id}
                  data-focus-id={lead.id}
                  data-lead-id={lead.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${lead.avatarBgClass}`}
                      >
                        {lead.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {lead.name}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                          {lead.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                    {lead.company || ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${lead.statusDotColor}`}
                      />
                      {lead.stageTitle}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {vm.sla &&
                    vm.sla.badgeLabel !== "No SLA" &&
                    (vm.sla.stageClock || vm.sla.milestoneClock) ? (
                      <div className="space-y-1">
                        <LeadSlaChip sla={vm.sla} variant="badge" />
                        <p className="truncate text-[10px] text-slate-500">
                          {vm.sla.milestoneClock
                            ? `${vm.sla.milestoneClock.label} · ${vm.sla.milestoneClock.detail}`
                            : vm.sla.stageClock?.detail}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                    {lead.owner}
                  </td>
                  <td className="px-3 py-2">
                    {summary.primary && summary.urgency ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPanel({
                            type: "activity-summary",
                            leadId: lead.id,
                            leadName: lead.name,
                            status: lead.statusTitle,
                          })
                        }
                        className={cn(
                          "w-full max-w-[240px] rounded-md px-2 py-1.5 text-left transition-colors",
                          URGENCY_SURFACE[summary.urgency],
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
                        )}
                        aria-label={[
                          "Activity Summary",
                          URGENCY_WORDS[summary.urgency],
                          summary.primary.title,
                          summary.dueLabel,
                          summary.moreCount > 0
                            ? `Plus ${summary.moreCount} more pending`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(". ")}
                        title={summary.primary.title}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate text-[11px] font-semibold">
                            {summaryTitle}
                          </span>
                          {summary.moreCount > 0 && (
                            <span className="shrink-0 text-[10px] font-medium opacity-90">
                              +{summary.moreCount}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] opacity-90">
                          {summary.dueLabel}
                        </div>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {vm.lastActivity ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPanel({
                            type: "last-activity",
                            leadId: lead.id,
                            leadName: lead.name,
                            status: lead.statusTitle,
                          })
                        }
                        className="max-w-[160px] truncate text-left text-[10px] text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1"
                        aria-label={`Last activity: ${vm.lastActivity.label}, ${vm.lastActivity.relativeTime}. Open activity history.`}
                        title={`${vm.lastActivity.label} · ${vm.lastActivity.relativeTime}`}
                      >
                        {vm.lastActivity.relativeTime}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className="flex items-center justify-end gap-0.5"
                      role="toolbar"
                      aria-label={`Quick actions for ${lead.name}`}
                    >
                      {vm.quickActions.map((action) => {
                        const Icon = QUICK_ICONS[action.kind];
                        const badge =
                          action.badgeCount >= 2
                            ? String(action.badgeCount)
                            : null;
                        const stateHint = QUICK_STATE_WORDS[action.urgency];
                        const countHint = badge ? `, ${badge} pending` : "";
                        return (
                          <button
                            key={action.kind}
                            type="button"
                            onClick={() =>
                              setPanel({
                                type: "quick-action",
                                kind: action.kind as QuickActionKind,
                                leadId: lead.id,
                                leadName: lead.name,
                                status: lead.statusTitle,
                                email: lead.email,
                                phone: lead.phone,
                              })
                            }
                            aria-label={`${QUICK_LABELS[action.kind]} — ${stateHint}${countHint}`}
                            title={`${QUICK_LABELS[action.kind]} (${stateHint})`}
                            className={cn(
                              "relative flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
                              QUICK_URGENCY[action.urgency],
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                            {badge && (
                              <span
                                className={cn(
                                  "absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none",
                                  QUICK_BADGE[action.urgency],
                                )}
                                aria-hidden
                              >
                                {badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        Showing {allLeads.length} leads
      </div>

      <LeadCardPanelHost
        panel={panel}
        onClose={() => setPanel(null)}
        revision={revision}
        onQuickActionSuccess={(message) => {
          flash(message);
          setRevision((n) => n + 1);
        }}
      />

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
