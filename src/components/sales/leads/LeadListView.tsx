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
import { onRulesChange } from "@/lib/rules";
import { onLeadActivityChange } from "@/lib/leads/lead-extras-store";
import {
  loadLeadCardSettings,
  onLeadCardSettingsChange,
  type LeadCardSettings,
} from "@/lib/leads/lead-card-settings";
import { onPipelineSlaChange, arePipelineSlaBadgesVisible } from "@/lib/pipeline-sla/settings";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import { truncateActivityTitle } from "@/lib/leads/activity-summary";
import {
  ACTIVITY_TITLE_TRUNCATE_AT,
  type LeadCardQuickActionState,
} from "@/lib/leads/card-types";
import {
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
import { TableDisplayOptionsMenu } from "@/components/common/TableDisplayOptionsMenu";
import {
  ManageColumnsModal,
  type ManageColumn,
} from "@/components/work-queue/ManageColumnsModal";

interface LeadListViewProps {
  columns?: KanbanColumn[];
  filters?: LeadFilters;
  /** Controlled list columns from List View settings. */
  manageColumns?: ManageColumn[];
  onManageColumnsChange?: (cols: ManageColumn[]) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  /** Open List View settings from the table gear (optional). */
  onOpenListSettings?: () => void;
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

export const DEFAULT_LEAD_LIST_COLUMNS: ManageColumn[] = [
  { id: "lead", label: "Lead", checked: true, required: true },
  { id: "company", label: "Company", checked: true },
  { id: "status", label: "Status", checked: true },
  { id: "sla", label: "Pipeline SLA", checked: true },
  { id: "owner", label: "Owner", checked: true },
  { id: "activity", label: "Activity", checked: true },
  { id: "lastActivity", label: "Last activity", checked: true },
  { id: "actions", label: "Actions", checked: true },
];

const DEFAULT_LEAD_COLUMNS = DEFAULT_LEAD_LIST_COLUMNS;

type LeadRow = ReturnType<typeof buildAllLeadsShape>;
// Helper purely for type inference — never called
function buildAllLeadsShape(columns: KanbanColumn[]) {
  return columns.flatMap((column) =>
    column.cards.map((card) => ({
      ...card,
      statusTitle: column.leadStatus,
      stageTitle: column.title,
      statusDotColor: column.dotColorClass,
    })),
  )[0];
}

type LeadVM = ReturnType<typeof buildLeadCardViewModelFromCard>;

interface ColumnRenderer {
  th: React.ReactNode;
  thClassName?: string;
  td: (lead: LeadRow, vm: LeadVM, summaryTitle: string) => React.ReactNode;
  tdClassName?: string;
}

function buildColumnRenderers(
  setPanel: (p: LeadPanelState | null) => void,
): Record<string, ColumnRenderer> {
  return {
    lead: {
      th: "Lead",
      tdClassName: "px-3 py-1 whitespace-nowrap",
      td: (lead) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${lead.avatarBgClass}`}
          >
            {lead.initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[13px] text-slate-900">
              {lead.name}
            </p>
            <p className="truncate text-[11px] text-slate-400">{lead.email}</p>
          </div>
        </div>
      ),
    },
    company: {
      th: "Company",
      tdClassName: "px-3 py-1 whitespace-nowrap text-[13px] text-slate-600",
      td: (lead) => lead.company || "",
    },
    status: {
      th: "Status",
      tdClassName: "px-3 py-1 whitespace-nowrap",
      td: (lead) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          <span className={`h-1.5 w-1.5 rounded-full ${lead.statusDotColor}`} />
          {lead.stageTitle}
        </span>
      ),
    },
    sla: {
      th: "Pipeline SLA",
      thClassName: "min-w-[140px] px-3 py-2",
      tdClassName: "px-3 py-1",
      td: (lead, vm) =>
        arePipelineSlaBadgesVisible() &&
        vm.sla &&
        vm.sla.badgeLabel !== "No SLA" &&
        (vm.sla.stageClock || vm.sla.milestoneClock) ? (
          <div className="space-y-0.5">
            <LeadSlaChip sla={vm.sla} variant="badge" />
            <p className="truncate text-[11px] text-slate-500">
              {vm.sla.milestoneClock
                ? `${vm.sla.milestoneClock.label} · ${vm.sla.milestoneClock.detail}`
                : vm.sla.stageClock?.detail}
            </p>
          </div>
        ) : (
          <span className="text-[12px] text-slate-300" />
        ),
    },
    owner: {
      th: "Owner",
      tdClassName: "px-3 py-1 whitespace-nowrap text-[13px] text-slate-600",
      td: (lead) => lead.owner,
    },
    activity: {
      th: "Activity",
      thClassName: "min-w-[200px] px-3 py-2",
      tdClassName: "px-3 py-1",
      td: (lead, vm, summaryTitle) => {
        const summary = vm.activitySummary;
        return summary.primary && summary.urgency ? (
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
              "w-full max-w-[240px] rounded-md px-2 py-1 text-left transition-colors",
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
              <span className="min-w-0 truncate text-[12px] font-semibold">
                {summaryTitle}
              </span>
              {summary.moreCount > 0 && (
                <span className="shrink-0 text-[11px] font-medium opacity-90">
                  +{summary.moreCount}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] opacity-90">
              {summary.dueLabel}
            </div>
          </button>
        ) : (
          <span className="text-[12px] text-slate-300" />
        );
      },
    },
    lastActivity: {
      th: "Last activity",
      tdClassName: "px-3 py-1 whitespace-nowrap",
      td: (lead, vm) =>
        vm.lastActivity ? (
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
            className="max-w-[160px] truncate text-left text-[11px] text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1"
            aria-label={`Last activity: ${vm.lastActivity.label}, ${vm.lastActivity.relativeTime}. Open activity history.`}
            title={`${vm.lastActivity.label} · ${vm.lastActivity.relativeTime}`}
          >
            {vm.lastActivity.relativeTime}
          </button>
        ) : (
          <span className="text-[12px] text-slate-300" />
        ),
    },
    actions: {
      th: "Actions",
      thClassName: "px-3 py-2 text-right",
      tdClassName: "px-3 py-1",
      td: (lead, vm) => (
        <div
          className="flex items-center justify-end gap-0.5"
          role="toolbar"
          aria-label={`Quick actions for ${lead.name}`}
        >
          {vm.quickActions.map((action) => {
            const Icon = QUICK_ICONS[action.kind];
            const stateHint = QUICK_STATE_WORDS[action.urgency];
            const countHint =
              action.badgeCount >= 2 ? `, ${action.badgeCount} pending` : "";
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
                aria-label={`${QUICK_LABELS[action.kind]}: ${stateHint}${countHint}`}
                title={`${QUICK_LABELS[action.kind]} (${stateHint})`}
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
                  QUICK_URGENCY.neutral,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </button>
            );
          })}
        </div>
      ),
    },
  };
}

export function LeadListView({
  columns: columnsProp,
  filters,
  manageColumns: manageColumnsProp,
  onManageColumnsChange,
  pageSize: pageSizeProp,
  onPageSizeChange,
  onOpenListSettings,
}: LeadListViewProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(
    () => columnsProp ?? listLeadColumns(),
  );
  const [cardSettings, setCardSettings] = useState<LeadCardSettings>(() =>
    loadLeadCardSettings(),
  );
  const [revision, setRevision] = useState(0);
  const [panel, setPanel] = useState<LeadPanelState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [internalPageSize, setInternalPageSize] = useState<number>(10);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [internalManageColumns, setInternalManageColumns] =
    useState<ManageColumn[]>(DEFAULT_LEAD_COLUMNS);

  const pageSize = pageSizeProp ?? internalPageSize;
  const setPageSize = onPageSizeChange ?? setInternalPageSize;
  const manageColumns = manageColumnsProp ?? internalManageColumns;
  const setManageColumns = onManageColumnsChange ?? setInternalManageColumns;

  useEffect(() => {
    if (columnsProp) setColumns(columnsProp);
  }, [columnsProp]);

  useEffect(() => {
    return onRulesChange(() => {
      if (!columnsProp) setColumns(listLeadColumns());
      setRevision((n) => n + 1);
    });
  }, [columnsProp]);

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

  const pagedLeads = useMemo(
    () => allLeads.slice(0, pageSize),
    [allLeads, pageSize],
  );

  const allSelected =
    pagedLeads.length > 0 && pagedLeads.every((l) => selectedIds.has(l.id));
  const someSelected =
    pagedLeads.some((l) => selectedIds.has(l.id)) && !allSelected;

  const columnRenderers = useMemo(() => buildColumnRenderers(setPanel), []);
  const orderedVisibleColumns = useMemo(
    () => manageColumns.filter((c) => c.checked),
    [manageColumns],
  );

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set([...prev, ...pagedLeads.map((l) => l.id)]);
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-[12px]">
          <thead className="border-b border-slate-100 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr className="sticky top-0 z-10 bg-slate-50/80">
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all leads"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
              </th>

              {orderedVisibleColumns.map((col) => (
                <th
                  key={col.id}
                  className={
                    columnRenderers[col.id]?.thClassName ?? "px-3 py-2.5"
                  }
                >
                  {columnRenderers[col.id]?.th}
                </th>
              ))}

              <th
                className={cn(
                  "sticky right-0 z-20 -mr-3 bg-slate-50/80 pr-3 pl-3 text-right",
                  "shadow-[-12px_0_12px_-8px_rgba(15,23,42,0.06)]",
                )}
              >
                <TableDisplayOptionsMenu
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  onManageColumns={() => {
                    if (onOpenListSettings) onOpenListSettings();
                    else setManageColumnsOpen(true);
                  }}
                  className="flex justify-end"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {pagedLeads.map((lead) => {
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
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      aria-label={`Select ${lead.name}`}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                  </td>

                  {orderedVisibleColumns.map((col) => (
                    <td
                      key={col.id}
                      className={
                        columnRenderers[col.id]?.tdClassName ?? "px-3 py-2"
                      }
                    >
                      {columnRenderers[col.id]?.td(lead, vm, summaryTitle)}
                    </td>
                  ))}

                  <td className="px-3 py-2" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        Showing {pagedLeads.length} of {allLeads.length} leads
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

      <ManageColumnsModal
        open={manageColumnsOpen}
        columns={manageColumns}
        onClose={() => setManageColumnsOpen(false)}
        onSave={(cols) => {
          setManageColumns(cols);
          setManageColumnsOpen(false);
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
