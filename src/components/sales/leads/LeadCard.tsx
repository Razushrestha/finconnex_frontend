"use client";

import { useId, useMemo, useState, useEffect } from "react";
import {
  Phone,
  MessageSquare,
  Mail,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Paperclip,
  Send,
  Plus,
  Minus,
  Bell,
  FileText,
  UserCog,
  MoreHorizontal,
  Speaker,
  Trash2,
  Settings,
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
import {
  CustomizeLeadCardDrawer,
  DEFAULT_LEAD_CARD_SETTINGS,
  type LeadCardCustomizationSettings,
} from "@/components/sales/leads/CustomizeLeadCardDrawer";
import {
  QuickActionsBar,
  type QuickActionItem,
} from "@/components/sales/QuickActionsBar";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";

interface LeadCardProps {
  card: LeadCardData;
  status: LeadStatus;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  viewModel?: LeadCardViewModel;
  cardSettings?: LeadCardSettings;
  revision?: number;
  onOpenActivitySummary?: () => void;
  onOpenLastActivity?: () => void;
  onQuickAction?: (kind: LeadCardQuickActionState["kind"]) => void;

  onSaveCardSettings?: (settings: LeadCardCustomizationSettings) => void;

  isSelected: boolean;
  onToggleSelect: (id: string) => void;
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
  onSaveCardSettings,
  isSelected,
  onToggleSelect,
}: LeadCardProps) {
  const nameId = useId();
  const [isMounted, setIsMounted] = useState(false);
  const [selected, setSelected] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customization, setCustomization] =
    useState<LeadCardCustomizationSettings>(DEFAULT_LEAD_CARD_SETTINGS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const vm = useMemo(() => {
    void revision;
    return (
      viewModelProp ??
      buildLeadCardViewModelFromCard(card, status, { cardSettings })
    );
  }, [viewModelProp, card, status, cardSettings, revision]);

  const summary = vm.activitySummary;
  const summaryTitle = summary.primary
    ? truncateActivityTitle(summary.primary.title, ACTIVITY_TITLE_TRUNCATE_AT)
    : "";

  const quickActionItems: QuickActionItem<LeadCardQuickActionState["kind"]>[] =
    vm.quickActions.map((action) => {
      const label = QUICK_LABELS[action.kind];
      const stateHint = QUICK_STATE_WORDS[action.urgency];
      const badge = action.badgeCount >= 2 ? String(action.badgeCount) : null;
      const countHint = badge ? `, ${badge} pending` : "";

      return {
        kind: action.kind,
        icon: QUICK_ICONS[action.kind],
        label,
        badgeCount: action.badgeCount,
        ariaLabel: `${label} — ${stateHint}${countHint}`,
        title: `${label} (${stateHint})`,
        colorClassName: QUICK_URGENCY[action.urgency],
        badgeClassName: QUICK_BADGE[action.urgency],
      };
    });

  return (
    <>
      <article
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        data-focus-id={card.id}
        data-lead-id={card.id}
        aria-labelledby={nameId}
        className={cn(
          "group w-full shrink-0 cursor-grab rounded-md bg-background p-3 shadow-2xs active:cursor-grabbing",
          cardMotion,
          isDragging && cardDragging,
        )}
      >
        {/* §3 Header: name + status; SLA badge (PDF top-right); optional owner avatar */}
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              id={nameId}
              className="truncate text-[13px] font-semibold text-foreground"
            >
              {vm.name}
            </h3>
            <p className="truncate text-[11px] text-foreground/70">
              <span className="sr-only">Pipeline stage: </span>
              {vm.sla?.stage ?? card.pipelineStage ?? vm.status}
            </p>
          </div>
          <div className="relative flex shrink-0 items-center gap-1.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(card.id)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${vm.name}`}
              className={cn(
                "h-3.5 w-3.5 rounded border-slate-300 transition-opacity",
                isSelected
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
            />
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

            {selected && (
              <LeadCardActionsMenu
                onClose={() => setSelected(false)}
                onCustomizeCard={() => {
                  setSelected(false);
                  setCustomizeOpen(true);
                }}
              />
            )}
          </div>
        </div>

        {/* §4 Dynamic fields — live, uncolored */}
        {vm.dynamicFields.length > 0 && (
          <dl className="mb-1.5 space-y-0.5 text-[11px] text-foreground/90">
            {vm.dynamicFields.map((field) => (
              <div key={field.key} className="truncate" title={field.value}>
                <dt className="sr-only">{field.label}</dt>
                <dd className="truncate">{field.value}</dd>
              </div>
            ))}
          </dl>
        )}

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
              "mb-1.5 w-full rounded-md px-2 py-1.5 text-left transition-colors",
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
              className={cn(
                "mt-0.5 text-[10px]",
                URGENCY_TEXT[summary.urgency],
              )}
            >
              <span className="sr-only">
                {URGENCY_WORDS[summary.urgency]}.{" "}
              </span>
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
            className="mb-1.5 block w-full truncate text-left text-[10px] text-foreground/70 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1"
            aria-label={`Last activity: ${vm.lastActivity.label}, ${isMounted ? vm.lastActivity.relativeTime : ""}. Open activity history.`}
            title={`${vm.lastActivity.label} · ${isMounted ? vm.lastActivity.relativeTime : ""}`}
          >
            Last activity {isMounted ? vm.lastActivity.relativeTime : "..."}
          </button>
        )}

        <QuickActionsBar
          actions={quickActionItems}
          onAction={onQuickAction}
          ariaLabel={`Quick actions for ${vm.name}`}
          className="border-t border-slate-100 pt-1.5"
        />
      </article>

      <CustomizeLeadCardDrawer
        open={customizeOpen}
        value={customization}
        onClose={() => setCustomizeOpen(false)}
        onSave={(next) => {
          setCustomization(next);
          onSaveCardSettings?.(next);
          setCustomizeOpen(false);
        }}
      />
    </>
  );
}

/** Bulk-action dropdown shown once a card is selected via its checkbox. */
function LeadCardActionsMenu({
  onClose,
  onCustomizeCard,
}: {
  onClose: () => void;
  onCustomizeCard: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-20"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1.5 text-left shadow-lg"
      >
        <MenuItem icon={Send} label="Send mail" />

        <MenuDivider />
        <MenuSectionLabel>Tags</MenuSectionLabel>
        <MenuItem icon={Plus} label="Add tag" />
        <MenuItem icon={Minus} label="Remove tag" />

        <MenuDivider />
        <div className="flex items-center justify-between px-3 pb-0.5 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            More
          </span>
          <MoreHorizontal className="h-3 w-3 text-slate-300" />
        </div>
        <MenuItem icon={CheckSquare} label="Create task" />
        <MenuItem icon={Bell} label="Set reminder" />
        <MenuItem icon={FileText} label="Mass update" />
        <MenuItem icon={UserCog} label="Change owner" />
        <MenuItem icon={Speaker} label="Add to campaign" />
        <MenuItem icon={Trash2} label="Delete" />
        <MenuItem
          icon={Settings}
          label="Customize Card"
          onClick={onCustomizeCard}
        />
      </div>
    </>
  );
}

function MenuSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-slate-100" />;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </button>
  );
}
