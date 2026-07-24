"use client";

import { useId, useMemo } from "react";
import {
  Phone,
  MessageSquare,
  Mail,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Paperclip,
} from "lucide-react";
import type { LeadCardData, LeadStatus } from "@/lib/leads/types";
import {
  ACTIVITY_TITLE_TRUNCATE_AT,
  type LeadCardQuickActionState,
  type LeadCardViewModel,
} from "@/lib/leads/card-types";
import { truncateActivityTitle } from "@/lib/leads/activity-summary";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import type { LeadCardSettings } from "@/lib/leads/lead-card-settings";
import {
  QUICK_BADGE,
  QUICK_STATE_WORDS,
  QUICK_URGENCY,
  URGENCY_SURFACE,
  URGENCY_TEXT,
  URGENCY_WORDS,
} from "@/lib/leads/a11y-urgency";
import { LeadSlaChip } from "@/components/sales/leads/LeadSlaChip";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";

interface LeadCardProps {
  card: LeadCardData;
  status: LeadStatus;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  /** Optional override (tests / story); otherwise built from card + status. */
  viewModel?: LeadCardViewModel;
  /** Admin settings; when omitted, loaded from settings store. */
  cardSettings?: LeadCardSettings;
  /** Bump after quick-action / settings changes so the card re-reads data. */
  revision?: number;
  onOpenActivitySummary?: () => void;
  onOpenLastActivity?: () => void;
  onQuickAction?: (kind: LeadCardQuickActionState["kind"]) => void;
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

export function LeadCard({
  card,
  status,
  isDragging,
  onDragStart,
  onDragEnd,
  viewModel: viewModelProp,
  cardSettings,
  revision = 0,
  onOpenActivitySummary,
  onOpenLastActivity,
  onQuickAction,
}: LeadCardProps) {
  const nameId = useId();
  const vm = useMemo(() => {
    void revision;
    return (
      viewModelProp ??
      buildLeadCardViewModelFromCard(card, status, { cardSettings })
    );
  }, [viewModelProp, card, status, cardSettings, revision]);

  const summary = vm.activitySummary;
  const summaryTitle = summary.primary
    ? truncateActivityTitle(
        summary.primary.title,
        ACTIVITY_TITLE_TRUNCATE_AT,
      )
    : "";

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-focus-id={card.id}
      data-lead-id={card.id}
      aria-labelledby={nameId}
      className={cn(
        "w-full cursor-grab rounded-md border border-slate-200/80 bg-white p-3 shadow-2xs active:cursor-grabbing",
        cardMotion,
        isDragging && cardDragging,
      )}
    >
      {/* §3 Header: name + status; SLA badge (PDF top-right); optional owner avatar */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            id={nameId}
            className="truncate text-[13px] font-semibold text-slate-900"
          >
            {vm.name}
          </h3>
          <p className="truncate text-[11px] text-slate-500">
            <span className="sr-only">Pipeline stage: </span>
            {vm.sla?.stage ?? card.pipelineStage ?? vm.status}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <LeadSlaChip sla={vm.sla} variant="badge" />
          {vm.showOwnerAvatar && (
            <button
              type="button"
              title={vm.owner.name}
              aria-label={`Owner ${vm.owner.name}`}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
            >
              {vm.owner.initials}
            </button>
          )}
        </div>
      </div>

      {/* §4 Dynamic fields — live, uncolored */}
      {vm.dynamicFields.length > 0 && (
        <dl className="mb-2 space-y-0.5 text-[11px] text-slate-600">
          {vm.dynamicFields.map((field) => (
            <div key={field.key} className="truncate" title={field.value}>
              <dt className="sr-only">{field.label}</dt>
              <dd className="truncate">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Session 16 — Stage Due + Milestone clocks (separate from Activity Summary) */}
      <LeadSlaChip sla={vm.sla} variant="panel" />

      {/* §5 Activity Summary — omit entirely when empty (§12) */}
      {summary.primary && summary.urgency && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenActivitySummary?.();
          }}
          className={cn(
            "mb-2 w-full rounded-md px-2 py-1.5 text-left transition-colors",
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
                +{summary.moreCount} more
              </span>
            )}
          </div>
          <div
            className={cn("mt-0.5 text-[10px]", URGENCY_TEXT[summary.urgency])}
          >
            <span className="sr-only">{URGENCY_WORDS[summary.urgency]}. </span>
            {summary.dueLabel}
          </div>
        </button>
      )}

      {/* §6 Last Activity — neutral / muted only */}
      {vm.lastActivity && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenLastActivity?.();
          }}
          className="mb-2 block w-full truncate text-left text-[10px] text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1"
          aria-label={`Last activity: ${vm.lastActivity.label}, ${vm.lastActivity.relativeTime}. Open activity history.`}
          title={`${vm.lastActivity.label} · ${vm.lastActivity.relativeTime}`}
        >
          Last activity {vm.lastActivity.relativeTime}
        </button>
      )}

      {/* §7 Quick actions — fixed 7, always present */}
      <div
        className="flex items-center justify-between gap-0.5 border-t border-slate-100 pt-2"
        role="toolbar"
        aria-label={`Quick actions for ${vm.name}`}
      >
        {vm.quickActions.map((action) => (
          <QuickActionButton
            key={action.kind}
            action={action}
            onAction={onQuickAction}
          />
        ))}
      </div>
    </article>
  );
}

function QuickActionButton({
  action,
  onAction,
}: {
  action: LeadCardQuickActionState;
  onAction?: (kind: LeadCardQuickActionState["kind"]) => void;
}) {
  const Icon = QUICK_ICONS[action.kind];
  const label = QUICK_LABELS[action.kind];
  const badge =
    action.badgeCount >= 2 ? String(action.badgeCount) : null;
  const stateHint = QUICK_STATE_WORDS[action.urgency];
  const countHint = badge ? `, ${badge} pending` : "";

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onAction?.(action.kind);
      }}
      aria-label={`${label} — ${stateHint}${countHint}`}
      title={`${label} (${stateHint})`}
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
}
